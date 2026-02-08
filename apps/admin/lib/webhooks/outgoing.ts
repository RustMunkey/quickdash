import { eq, and } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { outgoingWebhookEndpoints, outgoingWebhookDeliveries } from "@quickdash/db/schema"
import { inngest } from "@/lib/inngest"
import crypto from "crypto"
import { WEBHOOK_EVENTS, type WebhookEvent } from "./events"

// Re-export for convenience
export { WEBHOOK_EVENTS, type WebhookEvent }

interface WebhookPayload {
	event: WebhookEvent
	timestamp: string
	data: Record<string, unknown>
}

// Generate HMAC-SHA256 signature
function generateSignature(payload: string, secret: string): string {
	return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * Fire outgoing webhooks for a specific event
 * This queues the webhooks for async delivery via Inngest
 * IMPORTANT: workspaceId is REQUIRED to ensure proper tenant isolation
 */
export async function fireWebhooks(event: WebhookEvent, data: Record<string, unknown>, workspaceId: string) {
	if (!workspaceId) {
		console.error("[Webhooks] fireWebhooks called without workspaceId - skipping to prevent data leak")
		return { queued: 0 }
	}

	// Find all active endpoints for THIS WORKSPACE ONLY subscribed to this event
	const endpoints = await db
		.select()
		.from(outgoingWebhookEndpoints)
		.where(and(
			eq(outgoingWebhookEndpoints.isActive, true),
			eq(outgoingWebhookEndpoints.workspaceId, workspaceId)
		))

	// Filter to endpoints that are subscribed to this event
	const subscribedEndpoints = endpoints.filter((ep) => {
		const events = ep.events as string[]
		return events.includes(event) || events.includes("*")
	})

	if (subscribedEndpoints.length === 0) {
		return { queued: 0 }
	}

	// Create delivery records and queue via Inngest
	const deliveries = await Promise.all(
		subscribedEndpoints.map(async (endpoint) => {
			const payload: WebhookPayload = {
				event,
				timestamp: new Date().toISOString(),
				data,
			}

			// Create delivery record
			const [delivery] = await db
				.insert(outgoingWebhookDeliveries)
				.values({
					endpointId: endpoint.id,
					event,
					payload: payload as unknown as Record<string, unknown>,
					status: "pending",
				})
				.returning()

			// Queue for delivery via Inngest
			await inngest.send({
				name: "webhook/deliver",
				data: {
					deliveryId: delivery.id,
					endpointId: endpoint.id,
					url: endpoint.url,
					secret: endpoint.secret,
					headers: endpoint.headers,
					payload,
				},
			})

			return delivery
		})
	)

	return { queued: deliveries.length }
}

/**
 * Deliver a webhook (called by Inngest)
 */
export async function deliverWebhook(
	deliveryId: string,
	url: string,
	secret: string,
	customHeaders: Record<string, string>,
	payload: WebhookPayload
) {
	const payloadString = JSON.stringify(payload)
	const signature = generateSignature(payloadString, secret)

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"X-Webhook-Signature": `sha256=${signature}`,
		"X-Webhook-Event": payload.event,
		"X-Webhook-Timestamp": payload.timestamp,
		...customHeaders,
	}

	const startTime = Date.now()

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: payloadString,
		})

		const responseBody = await response.text()
		const duration = Date.now() - startTime

		// Update delivery record
		await db
			.update(outgoingWebhookDeliveries)
			.set({
				status: response.ok ? "success" : "failed",
				responseCode: response.status,
				responseBody: responseBody.slice(0, 2000), // Limit stored response
				deliveredAt: new Date(),
				attempts: 1, // Will be incremented by Inngest on retries
			})
			.where(eq(outgoingWebhookDeliveries.id, deliveryId))

		// Update endpoint last delivery status
		const [delivery] = await db
			.select()
			.from(outgoingWebhookDeliveries)
			.where(eq(outgoingWebhookDeliveries.id, deliveryId))
			.limit(1)

		if (delivery) {
			await db
				.update(outgoingWebhookEndpoints)
				.set({
					lastDeliveryAt: new Date(),
					lastDeliveryStatus: response.ok ? "success" : "failed",
				})
				.where(eq(outgoingWebhookEndpoints.id, delivery.endpointId))
		}

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${responseBody.slice(0, 200)}`)
		}

		return { success: true, duration, status: response.status }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"

		await db
			.update(outgoingWebhookDeliveries)
			.set({
				status: "failed",
				errorMessage,
			})
			.where(eq(outgoingWebhookDeliveries.id, deliveryId))

		throw error // Re-throw for Inngest retry
	}
}
