"use server"

import { db } from "@quickdash/db/client"
import { webhookEvents } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"

export async function getWebhookEvent(id: string) {
	const [event] = await db
		.select({
			id: webhookEvents.id,
			provider: webhookEvents.provider,
			eventType: webhookEvents.eventType,
			externalId: webhookEvents.externalId,
			status: webhookEvents.status,
			errorMessage: webhookEvents.errorMessage,
			payload: webhookEvents.payload,
			createdAt: webhookEvents.createdAt,
			processedAt: webhookEvents.processedAt,
		})
		.from(webhookEvents)
		.where(eq(webhookEvents.id, id))
		.limit(1)
	return event ?? null
}
