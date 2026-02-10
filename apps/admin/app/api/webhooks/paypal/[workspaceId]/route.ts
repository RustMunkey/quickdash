import { type NextRequest, NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations, orders, payments } from "@quickdash/db/schema"

async function getPayPalConfig(workspaceId: string) {
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "paypal"),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey?: string // live clientId
		apiSecret?: string // live clientSecret
	} | null
	const metadata = integration.metadata as {
		testClientId?: string
		testClientSecret?: string
		testMode?: boolean
	} | null

	const isTestMode = metadata?.testMode === true

	return {
		clientId: (isTestMode && metadata?.testClientId) ? metadata.testClientId : (credentials?.apiKey ?? null),
		clientSecret: (isTestMode && metadata?.testClientSecret) ? metadata.testClientSecret : (credentials?.apiSecret ?? null),
		mode: isTestMode ? "sandbox" as const : "live" as const,
	}
}

function getPayPalBaseUrl(mode: "sandbox" | "live"): string {
	return mode === "sandbox"
		? "https://api-m.sandbox.paypal.com"
		: "https://api-m.paypal.com"
}

async function getPayPalAccessToken(
	clientId: string,
	clientSecret: string,
	mode: "sandbox" | "live"
): Promise<string> {
	const baseUrl = getPayPalBaseUrl(mode)

	const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
		},
		body: "grant_type=client_credentials",
	})

	if (!res.ok) {
		throw new Error(`PayPal OAuth failed: ${res.status}`)
	}

	const data = await res.json()
	return data.access_token
}

/**
 * Verify PayPal webhook by calling PayPal's verification API
 */
async function verifyPayPalWebhook(
	accessToken: string,
	baseUrl: string,
	webhookId: string,
	headers: Record<string, string>,
	rawBody: string
): Promise<boolean> {
	try {
		const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				auth_algo: headers["paypal-auth-algo"],
				cert_url: headers["paypal-cert-url"],
				transmission_id: headers["paypal-transmission-id"],
				transmission_sig: headers["paypal-transmission-sig"],
				transmission_time: headers["paypal-transmission-time"],
				webhook_id: webhookId,
				webhook_event: JSON.parse(rawBody),
			}),
		})

		if (!res.ok) return false

		const data = await res.json()
		return data.verification_status === "SUCCESS"
	} catch {
		return false
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ workspaceId: string }> }
) {
	const { workspaceId } = await params

	const config = await getPayPalConfig(workspaceId)
	if (!config?.clientId || !config?.clientSecret) {
		return NextResponse.json(
			{ error: "PayPal not configured for this workspace" },
			{ status: 400 }
		)
	}

	const rawBody = await request.text()

	let event: {
		id: string
		event_type: string
		resource: Record<string, unknown>
		summary?: string
	}

	try {
		event = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	// PayPal sends event_type and resource in the webhook payload
	if (!event.event_type || !event.resource) {
		return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
	}

	try {
		switch (event.event_type) {
			case "CHECKOUT.ORDER.APPROVED": {
				// Order was approved by the buyer — auto-capture
				const paypalOrderId = event.resource.id as string
				if (!paypalOrderId) break

				const accessToken = await getPayPalAccessToken(config.clientId, config.clientSecret, config.mode)
				const baseUrl = getPayPalBaseUrl(config.mode)

				// Capture the payment
				const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
				})

				if (captureRes.ok) {
					const capture = await captureRes.json()
					const captureDetail = capture.purchase_units?.[0]?.payments?.captures?.[0]

					// Find order by PayPal order ID in metadata
					const orderId = (event.resource.metadata as Record<string, string>)?.orderId
					if (orderId && captureDetail) {
						await db
							.update(orders)
							.set({
								status: "confirmed",
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(orders.id, orderId),
									eq(orders.workspaceId, workspaceId)
								)
							)

						await db
							.insert(payments)
							.values({
								workspaceId,
								orderId,
								method: "paypal",
								provider: "paypal",
								status: "completed",
								amount: captureDetail.amount?.value || "0",
								currency: (captureDetail.amount?.currency_code || "USD").toUpperCase(),
								externalId: captureDetail.id,
								providerData: {
									paypalOrderId,
									captureId: captureDetail.id,
									payerEmail: capture.payer?.email_address,
								},
								paidAt: new Date(),
							})
					}
				}
				break
			}

			case "PAYMENT.CAPTURE.COMPLETED": {
				const captureId = event.resource.id as string
				const amount = (event.resource.amount as { value?: string; currency_code?: string }) || {}

				// Look for an order that has this capture ID in metadata
				// or update existing payment record
				if (captureId) {
					// Update payment status if we already have a record
					await db
						.update(payments)
						.set({
							status: "completed",
							paidAt: new Date(),
						})
						.where(
							and(
								eq(payments.externalId, captureId),
								eq(payments.workspaceId, workspaceId)
							)
						)
				}
				break
			}

			case "PAYMENT.CAPTURE.REFUNDED":
			case "PAYMENT.CAPTURE.REVERSED": {
				const captureId = (event.resource as { links?: { href: string; rel: string }[] })
					.links?.find((l) => l.rel === "up")?.href?.split("/").pop()

				if (captureId) {
					await db
						.update(payments)
						.set({
							status: "refunded",
							refundedAt: new Date(),
						})
						.where(
							and(
								eq(payments.externalId, captureId),
								eq(payments.workspaceId, workspaceId)
							)
						)
				}
				break
			}
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error("PayPal webhook processing error:", error)
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 }
		)
	}
}
