import { db } from "@quickdash/db"
import { webhookEvents, webhookIdempotency } from "@quickdash/db/schema"
import { eq, and, sql } from "@quickdash/db/drizzle"

export type WebhookProvider = "polar" | "resend" | "supplier"

export interface WebhookResult {
	success: boolean
	eventId?: string
	error?: string
	isDuplicate?: boolean
}

/**
 * Log an incoming webhook event for debugging and replay
 */
export async function logWebhookEvent({
	provider,
	eventType,
	externalId,
	payload,
	headers,
}: {
	provider: WebhookProvider
	eventType: string
	externalId?: string
	payload: Record<string, unknown>
	headers?: Record<string, string>
}): Promise<string> {
	const [event] = await db
		.insert(webhookEvents)
		.values({
			provider,
			eventType,
			externalId,
			payload,
			headers,
			status: "pending",
		})
		.returning({ id: webhookEvents.id })

	return event.id
}

/**
 * Check if a webhook has already been processed (idempotency)
 */
export async function isWebhookProcessed(
	provider: WebhookProvider,
	eventId: string
): Promise<boolean> {
	const existing = await db
		.select()
		.from(webhookIdempotency)
		.where(
			and(
				eq(webhookIdempotency.provider, provider),
				eq(webhookIdempotency.eventId, eventId)
			)
		)
		.limit(1)

	return existing.length > 0
}

/**
 * Mark a webhook as processed (for idempotency)
 */
export async function markWebhookProcessed(
	provider: WebhookProvider,
	eventId: string
): Promise<void> {
	await db
		.insert(webhookIdempotency)
		.values({
			provider,
			eventId,
		})
		.onConflictDoNothing()
}

/**
 * Update webhook event status
 */
export async function updateWebhookStatus(
	eventId: string,
	status: "processing" | "processed" | "failed",
	errorMessage?: string
): Promise<void> {
	if (status === "failed") {
		await db
			.update(webhookEvents)
			.set({
				status,
				processedAt: new Date(),
				errorMessage,
				retryCount: sql`${webhookEvents.retryCount} + 1`,
			})
			.where(eq(webhookEvents.id, eventId))
	} else {
		await db
			.update(webhookEvents)
			.set({
				status,
				processedAt: status === "processed" ? new Date() : undefined,
				errorMessage,
			})
			.where(eq(webhookEvents.id, eventId))
	}
}
