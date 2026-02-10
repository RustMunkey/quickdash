import { type NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations, orders, payments } from "@quickdash/db/schema"

async function getPolarConfig(workspaceId: string) {
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "polar"),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (!integration) return null

	const credentials = integration.credentials as { apiKey?: string } | null
	const metadata = integration.metadata as {
		webhookSecret?: string
		testAccessToken?: string
		testWebhookSecret?: string
		testMode?: boolean
	} | null

	const isTestMode = metadata?.testMode === true

	return {
		accessToken: (isTestMode && metadata?.testAccessToken) ? metadata.testAccessToken : (credentials?.apiKey ?? null),
		webhookSecret: (isTestMode && metadata?.testWebhookSecret) ? metadata.testWebhookSecret : (metadata?.webhookSecret ?? null),
		mode: isTestMode ? "sandbox" as const : "production" as const,
	}
}

/**
 * Verify Standard Webhooks / Svix signature (used by Polar)
 */
function verifyStandardWebhookSignature(
	rawBody: string,
	webhookId: string,
	timestamp: string,
	signatures: string,
	secret: string
): boolean {
	try {
		// Standard Webhooks secret is base64-encoded, optionally prefixed with "whsec_"
		const secretBytes = Buffer.from(
			secret.startsWith("whsec_") ? secret.slice(6) : secret,
			"base64"
		)

		// Check timestamp freshness (reject if older than 5 minutes)
		const ts = parseInt(timestamp)
		const now = Math.floor(Date.now() / 1000)
		if (Math.abs(now - ts) > 300) return false

		// Build signed content
		const signedContent = `${webhookId}.${timestamp}.${rawBody}`

		// Compute expected signature
		const expectedSig = createHmac("sha256", secretBytes)
			.update(signedContent)
			.digest("base64")

		// Compare against all provided signatures (comma-separated, each prefixed with "v1,")
		const sigs = signatures.split(" ")
		for (const sig of sigs) {
			const [version, value] = sig.split(",")
			if (version !== "v1" || !value) continue

			const expectedBuf = Buffer.from(expectedSig)
			const actualBuf = Buffer.from(value)
			if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
				return true
			}
		}

		return false
	} catch {
		return false
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ workspaceId: string }> }
) {
	const { workspaceId } = await params

	const config = await getPolarConfig(workspaceId)
	if (!config?.accessToken) {
		return NextResponse.json(
			{ error: "Polar not configured for this workspace" },
			{ status: 400 }
		)
	}

	const rawBody = await request.text()

	// Verify Standard Webhooks signature if we have a webhook secret
	if (config.webhookSecret) {
		const webhookId = request.headers.get("webhook-id") || request.headers.get("svix-id") || ""
		const timestamp = request.headers.get("webhook-timestamp") || request.headers.get("svix-timestamp") || ""
		const signature = request.headers.get("webhook-signature") || request.headers.get("svix-signature") || ""

		if (!webhookId || !timestamp || !signature) {
			return NextResponse.json(
				{ error: "Missing webhook signature headers" },
				{ status: 401 }
			)
		}

		const isValid = verifyStandardWebhookSignature(rawBody, webhookId, timestamp, signature, config.webhookSecret)
		if (!isValid) {
			console.error(`Polar webhook signature verification failed for workspace ${workspaceId}`)
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 401 }
			)
		}
	}

	let event: {
		type: string
		data: Record<string, unknown>
	}

	try {
		event = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	if (!event.type || !event.data) {
		return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
	}

	try {
		switch (event.type) {
			case "checkout.completed": {
				// Polar checkout was completed
				const checkout = event.data
				const checkoutId = checkout.id as string
				const orderId = (checkout.metadata as Record<string, string>)?.orderId

				if (orderId) {
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

					const amount = checkout.amount as number | undefined
					const currency = checkout.currency as string | undefined

					await db
						.insert(payments)
						.values({
							workspaceId,
							orderId,
							method: "polar",
							provider: "polar",
							status: "completed",
							amount: amount ? (amount / 100).toFixed(2) : "0",
							currency: (currency || "usd").toUpperCase(),
							externalId: checkoutId,
							providerData: {
								checkoutId,
								customerEmail: checkout.customer_email,
								productId: checkout.product_id,
							},
							paidAt: new Date(),
						})
				}
				break
			}

			case "order.completed": {
				// Polar order was fulfilled
				const polarOrder = event.data
				const orderId = (polarOrder.metadata as Record<string, string>)?.orderId

				if (orderId) {
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
				}
				break
			}

			case "order.refunded": {
				const polarOrder = event.data
				const checkoutId = polarOrder.checkout_id as string

				if (checkoutId) {
					await db
						.update(payments)
						.set({
							status: "refunded",
							refundedAt: new Date(),
						})
						.where(
							and(
								eq(payments.externalId, checkoutId),
								eq(payments.workspaceId, workspaceId)
							)
						)
				}
				break
			}
		}

		return NextResponse.json({ received: true })
	} catch (error) {
		console.error("Polar webhook processing error:", error)
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 }
		)
	}
}
