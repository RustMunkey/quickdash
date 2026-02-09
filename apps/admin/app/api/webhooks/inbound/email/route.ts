import { NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql } from "@quickdash/db/drizzle"
import { inboxEmails, users, notifications, orders, shipmentTracking, shippingCarriers, workspaces, workspaceMembers, workspaceIntegrations } from "@quickdash/db/schema"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { isShippingEmail, parseShippingEmail } from "@/lib/tracking/parser"
import { sendShippingNotification } from "@/lib/email/shipping-notifications"
import { registerTracking, isTrackingServiceConfigured } from "@/lib/tracking/service"

// Types for different inbound email formats
interface ContactFormPayload {
	type: "contact_form"
	name: string
	email: string
	subject?: string
	message: string
}

interface ResendInboundPayload {
	type: "email.received"
	data: {
		email_id: string
		from: string
		to: string[]
		subject: string
		text?: string
		html?: string
		created_at: string
	}
}

interface GenericEmailPayload {
	type?: "email" | "forward"
	from_name?: string
	from_email: string
	to?: string
	subject: string
	body: string
	body_html?: string
	source_id?: string
}

type InboundPayload = ContactFormPayload | ResendInboundPayload | GenericEmailPayload

function parseFromHeader(from: string): { name: string; email: string } {
	// Parse "Name <email@example.com>" or just "email@example.com"
	const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/)
	if (match) {
		return {
			name: match[1]?.trim() || match[2],
			email: match[2].trim(),
		}
	}
	return { name: from, email: from }
}

export async function POST(request: Request) {
	let payload: InboundPayload

	try {
		payload = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	let fromName: string
	let fromEmail: string
	let subject: string
	let body: string
	let bodyHtml: string | undefined
	let source: string
	let sourceId: string | undefined

	// Handle different payload formats
	if ("type" in payload && payload.type === "contact_form") {
		// Contact form submission
		const p = payload as ContactFormPayload
		fromName = p.name
		fromEmail = p.email
		subject = p.subject || "Contact Form Submission"
		body = p.message
		source = "contact_form"
	} else if ("type" in payload && payload.type === "email.received") {
		// Resend inbound email webhook
		const p = payload as ResendInboundPayload
		const parsed = parseFromHeader(p.data.from)
		fromName = parsed.name
		fromEmail = parsed.email
		subject = p.data.subject
		body = p.data.text || ""
		bodyHtml = p.data.html
		source = "resend_inbound"
		sourceId = p.data.email_id
	} else {
		// Generic email forward or direct API call
		const p = payload as GenericEmailPayload
		if (p.from_name) {
			fromName = p.from_name
			fromEmail = p.from_email
		} else {
			const parsed = parseFromHeader(p.from_email)
			fromName = parsed.name
			fromEmail = parsed.email
		}
		subject = p.subject
		body = p.body
		bodyHtml = p.body_html
		source = p.type === "forward" ? "email_forward" : "api"
		sourceId = p.source_id
	}

	// Validate required fields
	if (!fromEmail || !subject || !body) {
		return NextResponse.json(
			{ error: "Missing required fields: from_email, subject, body" },
			{ status: 400 }
		)
	}

	// Basic email validation
	if (!fromEmail.includes("@")) {
		return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
	}

	try {
		// Determine the 'to' address to route this email to the correct workspace
		let toEmail: string | null = null
		if ("type" in payload && payload.type === "email.received") {
			toEmail = (payload as ResendInboundPayload).data.to?.[0] || null
		} else if ("to" in payload) {
			toEmail = (payload as GenericEmailPayload).to || null
		}

		// Look up workspace by matching 'to' address against configured Resend fromEmail
		let workspace: { id: string } | undefined
		if (toEmail) {
			const [match] = await db
				.select({ workspaceId: workspaceIntegrations.workspaceId })
				.from(workspaceIntegrations)
				.where(
					and(
						eq(workspaceIntegrations.provider, "resend"),
						eq(workspaceIntegrations.isActive, true),
						sql`${workspaceIntegrations.metadata}->>'fromEmail' = ${toEmail}`
					)
				)
				.limit(1)
			if (match) {
				workspace = { id: match.workspaceId }
			}
		}

		// No fallback — reject emails that don't match any workspace
		if (!workspace) {
			console.log("[Inbound Email] No workspace matched for 'to' address:", toEmail)
			return NextResponse.json(
				{ error: "No workspace configured for this email address" },
				{ status: 404 }
			)
		}

		// Create inbox email (workspace-scoped)
		const [email] = await db
			.insert(inboxEmails)
			.values({
				workspaceId: workspace.id,
				fromName,
				fromEmail,
				subject,
				body,
				bodyHtml,
				source,
				sourceId,
			})
			.returning()

		// Broadcast to workspace via Pusher
		if (pusherServer && workspace) {
			await pusherServer.trigger(wsChannel(workspace.id, "inbox"), "new-email", {
				id: email.id,
				fromName,
				fromEmail,
				subject,
				body: body.slice(0, 200), // Preview only
				receivedAt: email.receivedAt.toISOString(),
				status: "unread",
			})
		}

		// Create notifications only for workspace members (not all users)
		if (workspace) {
			try {
				const members = await db
					.select({ userId: workspaceMembers.userId })
					.from(workspaceMembers)
					.where(eq(workspaceMembers.workspaceId, workspace.id))

				for (const member of members) {
					const emailLink = `/messages?email=${email.id}`
					const [notification] = await db
						.insert(notifications)
						.values({
							userId: member.userId,
							workspaceId: workspace.id,
							type: "inbox",
							title: `New email from ${fromName}`,
							body: subject,
							link: emailLink,
						})
						.returning()

					// Push real-time notification to each workspace member
					if (pusherServer && notification) {
						await pusherServer.trigger(`private-user-${member.userId}`, "notification", {
							id: notification.id,
							type: "inbox",
							title: `New email from ${fromName}`,
							body: subject,
							link: emailLink,
							createdAt: notification.createdAt.toISOString(),
							readAt: null,
						})
					}
				}
			} catch (notifError) {
				console.error("[Inbound Email] Failed to create notifications:", notifError)
			}
		}

		// Check if this is a shipping email and process tracking
		let shippingProcessed = false
		if (isShippingEmail(fromEmail, subject)) {
			try {
				const parsed = parseShippingEmail(fromEmail, subject, body)
				console.log("[Inbound Email] Detected shipping email:", {
					trackingNumbers: parsed.trackingNumbers.length,
					orderRefs: parsed.orderReferences,
					confidence: parsed.confidence,
				})

				// Process each tracking number found
				for (const { trackingNumber, carrier } of parsed.trackingNumbers) {
					// Try to match to an order
					let orderId: string | null = null

					// First try order references from the email
					for (const ref of parsed.orderReferences) {
						const [order] = await db
							.select({ id: orders.id })
							.from(orders)
							.where(eq(orders.orderNumber, ref))
							.limit(1)
						if (order) {
							orderId = order.id
							break
						}

						// Try partial match
						const [partialOrder] = await db
							.select({ id: orders.id })
							.from(orders)
							.where(sql`${orders.orderNumber} ILIKE ${`%${ref}%`}`)
							.limit(1)
						if (partialOrder) {
							orderId = partialOrder.id
							break
						}
					}

					// Check if tracking already exists
					const [existingTracking] = await db
						.select({ id: shipmentTracking.id })
						.from(shipmentTracking)
						.where(eq(shipmentTracking.trackingNumber, trackingNumber))
						.limit(1)

					if (!existingTracking && orderId) {
						// Use auto-detect if carrier not confidently identified
						const carrierCode = carrier?.code || "other"

						// Look up or create carrier
						let [existingCarrier] = await db
							.select({ id: shippingCarriers.id })
							.from(shippingCarriers)
							.where(eq(shippingCarriers.code, carrierCode))
							.limit(1)

						if (!existingCarrier) {
							// Create carrier if it doesn't exist
							const [newCarrier] = await db
								.insert(shippingCarriers)
								.values({
									name: carrier?.name || carrierCode.toUpperCase(),
									code: carrierCode,
									trackingUrlTemplate: carrier?.trackingUrl || null,
								})
								.returning({ id: shippingCarriers.id })
							existingCarrier = newCarrier
						}

						// Add new tracking to order
						const [newTracking] = await db
							.insert(shipmentTracking)
							.values({
								orderId,
								trackingNumber,
								carrierId: existingCarrier.id,
								status: "label_created",
								statusHistory: [{
									status: "label_created",
									timestamp: new Date().toISOString(),
								}],
								source: "email",
								sourceDetails: {
									sender: fromEmail,
									subject: subject,
									confidence: parsed.confidence || "low",
								},
							})
							.returning()

						console.log("[Inbound Email] Created tracking:", newTracking.id)

						// Register with 17track for live status updates
						if (isTrackingServiceConfigured()) {
							registerTracking(trackingNumber, carrierCode, orderId)
								.then(result => {
									if (result.success) {
										console.log("[Inbound Email] Registered with 17track:", trackingNumber)
									} else {
										console.warn("[Inbound Email] 17track registration failed:", result.error)
									}
								})
								.catch(err => {
									console.error("[Inbound Email] 17track registration error:", err)
								})
						}

						// Update order status to shipped
						await db
							.update(orders)
							.set({
								status: "shipped",
								trackingNumber: trackingNumber,
							})
							.where(eq(orders.id, orderId))

						// Send customer shipped notification
						sendShippingNotification({
							orderId,
							workspaceId: workspace.id,
							trackingNumber,
							trackingUrl: carrier?.trackingUrl,
							carrierName: carrier?.name,
							status: "shipped",
						}).catch(err => {
							console.error("[Inbound Email] Failed to send shipping notification:", err)
						})

						shippingProcessed = true

						// Broadcast tracking update (workspace-scoped)
						if (pusherServer) {
							const [orderForWs] = await db
								.select({ workspaceId: orders.workspaceId })
								.from(orders)
								.where(eq(orders.id, orderId))
								.limit(1)
							if (orderForWs?.workspaceId) {
								await pusherServer.trigger(wsChannel(orderForWs.workspaceId, "orders"), "shipment:created", {
									trackingId: newTracking.id,
									orderId,
									trackingNumber,
									carrier: carrier?.code,
								})
							}
						}
					} else if (!existingTracking && !orderId) {
						// Tracking found but no order match - log for manual review
						console.log("[Inbound Email] Tracking found but no order match:", {
							trackingNumber,
							carrier: carrier?.code || "auto",
							orderRefs: parsed.orderReferences,
						})
					}
				}
			} catch (shippingError) {
				console.error("[Inbound Email] Shipping processing error:", shippingError)
			}
		}

		return NextResponse.json({
			success: true,
			id: email.id,
			message: "Email received",
			shippingProcessed,
		})
	} catch (error) {
		console.error("[Inbound Email] Failed to save:", error)
		return NextResponse.json(
			{ error: "Failed to save email" },
			{ status: 500 }
		)
	}
}

// Allow GET for health check
export async function GET() {
	return NextResponse.json({ status: "ok", endpoint: "inbound-email" })
}
