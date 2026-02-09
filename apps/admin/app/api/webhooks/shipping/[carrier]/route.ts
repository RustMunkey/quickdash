import { NextResponse } from "next/server"
import { eq, and } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import {
	webhookEndpoints,
	webhookEvents,
	webhookIdempotency,
	shipmentTracking,
	shippingCarriers,
	orders,
} from "@quickdash/db/schema"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { inngest } from "@/lib/inngest"
import { sendShippingNotification, mapToNotificationStatus } from "@/lib/email/shipping-notifications"
import crypto from "crypto"

// Normalized tracking event
interface NormalizedTrackingEvent {
	trackingNumber: string
	status: string
	statusDetail?: string
	location?: string
	timestamp: string
	estimatedDelivery?: string
	deliveredAt?: string
	rawPayload: Record<string, unknown>
}

// Carrier-specific normalizers
const normalizers: Record<string, (payload: Record<string, unknown>) => NormalizedTrackingEvent | null> = {
	// ShipStation webhook format
	shipstation: (payload) => {
		const data = payload as {
			resource_url?: string
			resource_type?: string
			tracking_number?: string
			carrier_code?: string
			shipment_status?: string
		}
		if (data.resource_type !== "SHIP_NOTIFY") return null
		return {
			trackingNumber: data.tracking_number || "",
			status: mapShipStationStatus(data.shipment_status || ""),
			timestamp: new Date().toISOString(),
			rawPayload: payload,
		}
	},

	// Shippo webhook format
	shippo: (payload) => {
		const data = payload as {
			event?: string
			data?: {
				tracking_number?: string
				tracking_status?: {
					status?: string
					status_details?: string
					status_date?: string
					location?: { city?: string; state?: string; country?: string }
				}
				eta?: string
			}
		}
		if (!data.data?.tracking_number) return null
		const tracking = data.data.tracking_status
		return {
			trackingNumber: data.data.tracking_number,
			status: mapShippoStatus(tracking?.status || ""),
			statusDetail: tracking?.status_details,
			location: tracking?.location
				? [tracking.location.city, tracking.location.state, tracking.location.country]
						.filter(Boolean)
						.join(", ")
				: undefined,
			timestamp: tracking?.status_date || new Date().toISOString(),
			estimatedDelivery: data.data.eta,
			rawPayload: payload,
		}
	},

	// EasyPost webhook format
	easypost: (payload) => {
		const data = payload as {
			result?: {
				tracking_code?: string
				status?: string
				status_detail?: string
				est_delivery_date?: string
				tracking_details?: Array<{
					status?: string
					message?: string
					datetime?: string
					tracking_location?: { city?: string; state?: string; country?: string }
				}>
			}
		}
		if (!data.result?.tracking_code) return null
		const latest = data.result.tracking_details?.[0]
		return {
			trackingNumber: data.result.tracking_code,
			status: mapEasyPostStatus(data.result.status || ""),
			statusDetail: data.result.status_detail || latest?.message,
			location: latest?.tracking_location
				? [latest.tracking_location.city, latest.tracking_location.state]
						.filter(Boolean)
						.join(", ")
				: undefined,
			timestamp: latest?.datetime || new Date().toISOString(),
			estimatedDelivery: data.result.est_delivery_date,
			rawPayload: payload,
		}
	},

	// Generic/custom carrier - expects our standard format
	generic: (payload) => {
		const data = payload as {
			tracking_number?: string
			status?: string
			status_detail?: string
			location?: string
			timestamp?: string
			estimated_delivery?: string
			delivered_at?: string
		}
		if (!data.tracking_number || !data.status) return null
		return {
			trackingNumber: data.tracking_number,
			status: data.status,
			statusDetail: data.status_detail,
			location: data.location,
			timestamp: data.timestamp || new Date().toISOString(),
			estimatedDelivery: data.estimated_delivery,
			deliveredAt: data.delivered_at,
			rawPayload: payload,
		}
	},

	// Tracktry webhook format (legacy)
	tracktry: (payload) => {
		const data = payload as {
			tracking_number?: string
			carrier_code?: string
			status?: string
			substatus?: string
			original_country?: string
			destination_country?: string
			origin_info?: {
				trackinfo?: Array<{
					Date?: string
					StatusDescription?: string
					Details?: string
				}>
			}
			destination_info?: {
				trackinfo?: Array<{
					Date?: string
					StatusDescription?: string
					Details?: string
				}>
			}
		}
		if (!data.tracking_number) return null

		// Get latest tracking event
		const trackinfo = data.destination_info?.trackinfo || data.origin_info?.trackinfo || []
		const latest = trackinfo[0]

		return {
			trackingNumber: data.tracking_number,
			status: mapTracktryStatus(data.status || ""),
			statusDetail: data.substatus || latest?.StatusDescription,
			location: latest?.Details,
			timestamp: latest?.Date || new Date().toISOString(),
			rawPayload: payload,
		}
	},

	// 17track webhook format
	"17track": (payload) => {
		const data = payload as {
			event?: string
			data?: {
				number?: string
				carrier?: number
				tag?: string // Order ID stored as tag
				track_info?: {
					latest_status?: {
						status?: string
						sub_status?: string
					}
					latest_event?: {
						time_iso?: string
						description?: string
						location?: string
					}
					time_metrics?: {
						estimated_delivery_date?: {
							from?: string
							to?: string
						}
					}
				}
				track?: Array<{
					time_iso?: string
					description?: string
					location?: string
					stage?: string
				}>
			}
		}

		if (!data.data?.number) return null

		const trackInfo = data.data.track_info
		const latestEvent = trackInfo?.latest_event
		const latestTrack = data.data.track?.[0]

		return {
			trackingNumber: data.data.number,
			status: map17trackStatus(trackInfo?.latest_status?.status || ""),
			statusDetail: trackInfo?.latest_status?.sub_status || latestTrack?.description,
			location: latestEvent?.location || latestTrack?.location,
			timestamp: latestEvent?.time_iso || latestTrack?.time_iso || new Date().toISOString(),
			estimatedDelivery: trackInfo?.time_metrics?.estimated_delivery_date?.to,
			rawPayload: payload,
		}
	},
}

// Tracktry status mapping (legacy)
function mapTracktryStatus(status: string): string {
	const map: Record<string, string> = {
		pending: "pending",
		notfound: "pending",
		transit: "in_transit",
		pickup: "in_transit",
		delivered: "delivered",
		undelivered: "exception",
		exception: "exception",
		expired: "exception",
	}
	return map[status.toLowerCase()] || status.toLowerCase()
}

// 17track status mapping
function map17trackStatus(status: string): string {
	// 17track statuses: NotFound, InfoReceived, InTransit, Expired,
	// AvailableForPickup, OutForDelivery, DeliveryFailure, Delivered, Exception
	const map: Record<string, string> = {
		notfound: "pending",
		inforeceived: "label_created",
		intransit: "in_transit",
		expired: "expired",
		availableforpickup: "available_for_pickup",
		outfordelivery: "out_for_delivery",
		deliveryfailure: "exception",
		delivered: "delivered",
		exception: "exception",
	}
	return map[status.toLowerCase().replace(/_/g, "")] || status.toLowerCase()
}

// Status mappings to our standard statuses
function mapShipStationStatus(status: string): string {
	const map: Record<string, string> = {
		shipped: "in_transit",
		delivered: "delivered",
		exception: "exception",
	}
	return map[status.toLowerCase()] || "unknown"
}

function mapShippoStatus(status: string): string {
	const map: Record<string, string> = {
		PRE_TRANSIT: "pre_transit",
		TRANSIT: "in_transit",
		DELIVERED: "delivered",
		RETURNED: "returned",
		FAILURE: "exception",
		UNKNOWN: "unknown",
	}
	return map[status] || status.toLowerCase()
}

function mapEasyPostStatus(status: string): string {
	const map: Record<string, string> = {
		pre_transit: "pre_transit",
		in_transit: "in_transit",
		out_for_delivery: "out_for_delivery",
		delivered: "delivered",
		available_for_pickup: "available_for_pickup",
		return_to_sender: "returned",
		failure: "exception",
		unknown: "unknown",
	}
	return map[status.toLowerCase()] || status.toLowerCase()
}

// Verify webhook signature (carrier-specific)
function verifySignature(carrier: string, payload: string, signature: string | null, secret: string): boolean {
	if (!signature) return false

	switch (carrier) {
		case "shipstation":
			// ShipStation uses HMAC-SHA256
			const expectedSig = crypto
				.createHmac("sha256", secret)
				.update(payload)
				.digest("base64")
			return signature === expectedSig

		case "shippo":
			// Shippo uses HMAC-SHA256 with hex encoding
			const shippoSig = crypto
				.createHmac("sha256", secret)
				.update(payload)
				.digest("hex")
			return signature === shippoSig

		case "easypost":
			// EasyPost uses HMAC-SHA256 with hex encoding
			const easypostSig = crypto
				.createHmac("sha256", secret)
				.update(payload)
				.digest("hex")
			return `hmac-sha256-hex=${easypostSig}` === signature

		default:
			// Generic HMAC-SHA256
			const genericSig = crypto
				.createHmac("sha256", secret)
				.update(payload)
				.digest("hex")
			return signature === genericSig || signature === `sha256=${genericSig}`
	}
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ carrier: string }> }
) {
	const { carrier } = await params
	const carrierLower = carrier.toLowerCase()

	// Get raw body for signature verification
	const rawBody = await request.text()
	let payload: Record<string, unknown>
	try {
		payload = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	// Check if we have a webhook endpoint configured for this carrier
	const [endpoint] = await db
		.select()
		.from(webhookEndpoints)
		.where(
			and(
				eq(webhookEndpoints.provider, `shipping-${carrierLower}`),
				eq(webhookEndpoints.isActive, true)
			)
		)
		.limit(1)

	// Verify signature if endpoint has a secret
	if (endpoint?.secretKey) {
		const signature =
			request.headers.get("x-shipstation-hmac-sha256") ||
			request.headers.get("shippo-api-version") || // Shippo uses different header
			request.headers.get("x-easypost-signature") ||
			request.headers.get("x-webhook-signature") ||
			request.headers.get("x-signature")

		if (!verifySignature(carrierLower, rawBody, signature, endpoint.secretKey)) {
			console.warn(`[Shipping Webhook] Invalid signature for ${carrier}`)
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
		}
	}

	// Log the webhook event
	const [event] = await db
		.insert(webhookEvents)
		.values({
			provider: `shipping-${carrierLower}`,
			eventType: "tracking_update",
			externalId: payload.id?.toString() || payload.event_id?.toString() || null,
			payload,
			headers: Object.fromEntries(request.headers.entries()),
			status: "pending",
		})
		.returning()

	// Normalize the payload
	const normalizer = normalizers[carrierLower] || normalizers.generic
	const normalized = normalizer(payload)

	if (!normalized) {
		await db
			.update(webhookEvents)
			.set({ status: "failed", errorMessage: "Could not normalize payload" })
			.where(eq(webhookEvents.id, event.id))
		return NextResponse.json({ error: "Could not parse payload" }, { status: 400 })
	}

	// Check idempotency
	const idempotencyKey = `${carrierLower}-${normalized.trackingNumber}-${normalized.timestamp}`
	const [existing] = await db
		.select()
		.from(webhookIdempotency)
		.where(
			and(
				eq(webhookIdempotency.provider, `shipping-${carrierLower}`),
				eq(webhookIdempotency.eventId, idempotencyKey)
			)
		)
		.limit(1)

	if (existing) {
		await db
			.update(webhookEvents)
			.set({ status: "processed", processedAt: new Date() })
			.where(eq(webhookEvents.id, event.id))
		return NextResponse.json({ success: true, message: "Already processed" })
	}

	// Find the carrier in our database
	const [dbCarrier] = await db
		.select()
		.from(shippingCarriers)
		.where(eq(shippingCarriers.code, carrierLower))
		.limit(1)

	// Find shipment tracking record
	const [tracking] = await db
		.select()
		.from(shipmentTracking)
		.where(eq(shipmentTracking.trackingNumber, normalized.trackingNumber))
		.limit(1)

	if (tracking) {
		// Check if status changed (for notifications)
		const previousStatus = tracking.status
		const statusChanged = previousStatus !== normalized.status

		// Update existing tracking
		const currentHistory = (tracking.statusHistory as Array<{ status: string; timestamp: string; location?: string }>) || []
		const newHistoryEntry = {
			status: normalized.status,
			timestamp: normalized.timestamp,
			location: normalized.location,
		}

		await db
			.update(shipmentTracking)
			.set({
				status: normalized.status,
				statusHistory: [...currentHistory, newHistoryEntry],
				estimatedDelivery: normalized.estimatedDelivery
					? new Date(normalized.estimatedDelivery)
					: tracking.estimatedDelivery,
				lastUpdatedAt: new Date(),
			})
			.where(eq(shipmentTracking.id, tracking.id))

		// Update order status if delivered
		if (normalized.status === "delivered") {
			await db
				.update(orders)
				.set({ status: "delivered" })
				.where(eq(orders.id, tracking.orderId))
		}

		// Send customer notification if status changed to a notifiable status
		if (statusChanged) {
			const notificationStatus = mapToNotificationStatus(normalized.status)
			const previousNotificationStatus = mapToNotificationStatus(previousStatus || "")

			// Only send if it's a new notification-worthy status we haven't notified about
			if (notificationStatus && notificationStatus !== previousNotificationStatus) {
				// Get carrier info for tracking URL
				let trackingUrl: string | undefined
				let carrierName: string | undefined

				if (tracking.carrierId) {
					const [carrier] = await db
						.select({ name: shippingCarriers.name, trackingUrlTemplate: shippingCarriers.trackingUrlTemplate })
						.from(shippingCarriers)
						.where(eq(shippingCarriers.id, tracking.carrierId))
						.limit(1)

					if (carrier) {
						carrierName = carrier.name
						trackingUrl = carrier.trackingUrlTemplate?.replace("{tracking}", normalized.trackingNumber)
					}
				}

				// Get workspaceId from the order for workspace-scoped email
				const [orderWs] = await db
					.select({ workspaceId: orders.workspaceId })
					.from(orders)
					.where(eq(orders.id, tracking.orderId))
					.limit(1)

				if (orderWs?.workspaceId) {
					// Send notification (non-blocking)
					sendShippingNotification({
						orderId: tracking.orderId,
						workspaceId: orderWs.workspaceId,
						trackingNumber: normalized.trackingNumber,
						trackingUrl,
						carrierName,
						status: notificationStatus,
						estimatedDelivery: normalized.estimatedDelivery,
						location: normalized.location,
					}).catch((err) => {
						console.error("[Shipping Webhook] Failed to send notification:", err)
					})
				}
			}
		}

		// Broadcast via Pusher (workspace-scoped)
		if (pusherServer) {
			const [orderForWs] = await db
				.select({ workspaceId: orders.workspaceId })
				.from(orders)
				.where(eq(orders.id, tracking.orderId))
				.limit(1)
			if (orderForWs?.workspaceId) {
				await pusherServer.trigger(wsChannel(orderForWs.workspaceId, "orders"), "shipment:updated", {
					trackingId: tracking.id,
					orderId: tracking.orderId,
					trackingNumber: normalized.trackingNumber,
					status: normalized.status,
					statusDetail: normalized.statusDetail,
					location: normalized.location,
					timestamp: normalized.timestamp,
				})
			}
		}
	}

	// Record idempotency
	await db.insert(webhookIdempotency).values({
		provider: `shipping-${carrierLower}`,
		eventId: idempotencyKey,
	})

	// Mark event as processed
	await db
		.update(webhookEvents)
		.set({ status: "processed", processedAt: new Date() })
		.where(eq(webhookEvents.id, event.id))

	// Update endpoint last received
	if (endpoint) {
		await db
			.update(webhookEndpoints)
			.set({ lastReceivedAt: new Date() })
			.where(eq(webhookEndpoints.id, endpoint.id))
	}

	return NextResponse.json({ success: true })
}

// GET handler for webhook URL verification
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ carrier: string }> }
) {
	const { carrier } = await params
	return NextResponse.json({
		status: "ok",
		carrier: carrier,
		message: "Webhook endpoint is active",
		timestamp: new Date().toISOString(),
	})
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization, 17token, X-Webhook-Signature",
		},
	})
}
