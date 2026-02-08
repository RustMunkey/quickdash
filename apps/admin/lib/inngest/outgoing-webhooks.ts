import { inngest } from "@/lib/inngest"
import { deliverWebhook } from "@/lib/webhooks/outgoing"
import { eq, sql } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { outgoingWebhookDeliveries } from "@quickdash/db/schema"

// Webhook delivery with exponential backoff retries
export const webhookDeliver = inngest.createFunction(
	{
		id: "webhook-deliver",
		retries: 5, // Will retry up to 5 times
	},
	{ event: "webhook/deliver" },
	async ({ event, step }) => {
		const { deliveryId, url, secret, headers, payload } = event.data

		// Increment attempt counter
		await step.run("increment-attempts", async () => {
			await db
				.update(outgoingWebhookDeliveries)
				.set({
					attempts: sql`${outgoingWebhookDeliveries.attempts} + 1`,
				})
				.where(eq(outgoingWebhookDeliveries.id, deliveryId))
		})

		// Attempt delivery
		const result = await step.run("deliver", async () => {
			return deliverWebhook(deliveryId, url, secret, headers || {}, payload)
		})

		return result
	}
)

// Cleanup old webhook deliveries (runs daily)
export const webhookDeliveryCleanup = inngest.createFunction(
	{
		id: "webhook-delivery-cleanup",
	},
	{ cron: "0 3 * * *" }, // 3 AM daily
	async ({ step }) => {
		// Delete successful deliveries older than 7 days
		const deletedSuccess = await step.run("cleanup-success", async () => {
			const result = await db
				.delete(outgoingWebhookDeliveries)
				.where(
					sql`${outgoingWebhookDeliveries.status} = 'success'
					AND ${outgoingWebhookDeliveries.createdAt} < NOW() - INTERVAL '7 days'`
				)
			return { deleted: "success" }
		})

		// Delete failed deliveries older than 30 days
		const deletedFailed = await step.run("cleanup-failed", async () => {
			const result = await db
				.delete(outgoingWebhookDeliveries)
				.where(
					sql`${outgoingWebhookDeliveries.status} = 'failed'
					AND ${outgoingWebhookDeliveries.createdAt} < NOW() - INTERVAL '30 days'`
				)
			return { deleted: "failed" }
		})

		return { success: deletedSuccess, failed: deletedFailed }
	}
)
