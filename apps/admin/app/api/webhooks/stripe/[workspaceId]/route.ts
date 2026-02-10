import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations, orders, payments } from "@quickdash/db/schema"

async function getStripeConfig(workspaceId: string) {
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "stripe"),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (!integration) return null

	const credentials = integration.credentials as { apiKey?: string } | null
	const metadata = integration.metadata as {
		webhookSecret?: string
		testSecretKey?: string
		testWebhookSecret?: string
		testMode?: boolean
	} | null

	const isTestMode = metadata?.testMode === true

	return {
		secretKey: (isTestMode && metadata?.testSecretKey) ? metadata.testSecretKey : (credentials?.apiKey ?? null),
		webhookSecret: (isTestMode && metadata?.testWebhookSecret) ? metadata.testWebhookSecret : (metadata?.webhookSecret ?? null),
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ workspaceId: string }> }
) {
	const { workspaceId } = await params

	// Get workspace Stripe config
	const config = await getStripeConfig(workspaceId)
	if (!config?.secretKey || !config?.webhookSecret) {
		return NextResponse.json(
			{ error: "Stripe not configured for this workspace" },
			{ status: 400 }
		)
	}

	// Read raw body for signature verification
	const rawBody = await request.text()
	const signature = request.headers.get("stripe-signature")

	if (!signature) {
		return NextResponse.json(
			{ error: "Missing stripe-signature header" },
			{ status: 400 }
		)
	}

	// Verify webhook signature
	let event: Stripe.Event
	try {
		const stripe = new Stripe(config.secretKey)
		event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret)
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error"
		console.error(`Stripe webhook signature verification failed: ${message}`)
		return NextResponse.json(
			{ error: "Invalid signature" },
			{ status: 401 }
		)
	}

	// Handle events
	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session

				if (session.payment_status === "paid") {
					// Check if we have an order ID in metadata
					const orderId = session.metadata?.orderId
					if (orderId) {
						// Update order status to confirmed
						await db
							.update(orders)
							.set({
								status: "confirmed",
								updatedAt: new Date(),
								metadata: {
									stripeSessionId: session.id,
									stripePaymentIntent: session.payment_intent as string,
								},
							})
							.where(
								and(
									eq(orders.id, orderId),
									eq(orders.workspaceId, workspaceId)
								)
							)

						// Create payment record
						await db
							.insert(payments)
							.values({
								workspaceId,
								orderId,
								method: "card",
								provider: "stripe",
								status: "completed",
								amount: ((session.amount_total ?? 0) / 100).toFixed(2),
								currency: (session.currency ?? "usd").toUpperCase(),
								externalId: session.payment_intent as string,
								providerData: {
									sessionId: session.id,
									paymentIntent: session.payment_intent,
									customerEmail: session.customer_details?.email,
								},
								paidAt: new Date(),
							})
					}
				}
				break
			}

			case "checkout.session.expired": {
				const session = event.data.object as Stripe.Checkout.Session
				const orderId = session.metadata?.orderId
				if (orderId) {
					await db
						.update(orders)
						.set({
							status: "cancelled",
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(orders.id, orderId),
								eq(orders.workspaceId, workspaceId)
							)
						)
				}
				break
			}

			case "charge.refunded": {
				const charge = event.data.object as Stripe.Charge
				const paymentIntentId = charge.payment_intent as string
				if (paymentIntentId) {
					await db
						.update(payments)
						.set({
							status: "refunded",
							refundedAt: new Date(),
						})
						.where(
							and(
								eq(payments.externalId, paymentIntentId),
								eq(payments.workspaceId, workspaceId)
							)
						)
				}
				break
			}
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error("Stripe webhook processing error:", error)
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 }
		)
	}
}
