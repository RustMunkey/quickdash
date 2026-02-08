import { inngest } from "./inngest"
import { polarHandlers } from "./inngest/polar-handlers"
import { resendHandlers } from "./inngest/resend-handlers"
import { presenceHandlers } from "./inngest/presence-handlers"
import { webhookDeliver, webhookDeliveryCleanup } from "./inngest/outgoing-webhooks"
import { auctionHandlers } from "./inngest/auction-handlers"
import { workflowHandlers } from "./inngest/workflow-handlers"
import { emailHandlers } from "./inngest/email-handlers"

// Order confirmation email
export const sendOrderConfirmation = inngest.createFunction(
	{ id: "send-order-confirmation" },
	{ event: "order/created" },
	async ({ event, step }) => {
		const { orderId, customerEmail, orderNumber } = event.data

		await step.run("send-email", async () => {
			// TODO: Send email via Resend when configured
			console.log(`Sending order confirmation to ${customerEmail} for order ${orderNumber}`)
		})

		return { success: true, orderId }
	}
)

// Low stock alert
export const sendLowStockAlert = inngest.createFunction(
	{ id: "send-low-stock-alert" },
	{ event: "inventory/low-stock" },
	async ({ event, step }) => {
		const { productId, productName, currentStock, threshold } = event.data

		await step.run("notify-team", async () => {
			// TODO: Send Pusher notification to admin team
			console.log(`Low stock alert: ${productName} has ${currentStock} units (threshold: ${threshold})`)
		})

		return { success: true, productId }
	}
)

// Subscription renewal reminder
export const sendSubscriptionReminder = inngest.createFunction(
	{ id: "send-subscription-reminder" },
	{ event: "subscription/renewal-upcoming" },
	async ({ event, step }) => {
		const { subscriptionId, customerEmail, renewalDate } = event.data

		await step.run("send-reminder", async () => {
			// TODO: Send email via Resend when configured
			console.log(`Sending subscription renewal reminder to ${customerEmail} for ${renewalDate}`)
		})

		return { success: true, subscriptionId }
	}
)

// Process subscription renewal
export const processSubscriptionRenewal = inngest.createFunction(
	{ id: "process-subscription-renewal" },
	{ event: "subscription/renew" },
	async ({ event, step }) => {
		const { subscriptionId } = event.data

		const result = await step.run("charge-customer", async () => {
			// TODO: Process payment via Polar
			console.log(`Processing renewal for subscription ${subscriptionId}`)
			return { charged: true }
		})

		if (result.charged) {
			await step.run("create-order", async () => {
				// TODO: Create new order from subscription
				console.log(`Creating order for subscription ${subscriptionId}`)
			})
		}

		return { success: true, subscriptionId }
	}
)

// Scheduled: Check for expiring subscriptions daily
export const checkExpiringSubscriptions = inngest.createFunction(
	{ id: "check-expiring-subscriptions" },
	{ cron: "0 9 * * *" }, // Every day at 9 AM
	async ({ step }) => {
		await step.run("find-expiring", async () => {
			// TODO: Query subscriptions expiring in 3 days
			console.log("Checking for expiring subscriptions...")
		})

		return { success: true }
	}
)

// Scheduled: Generate daily sales report
export const generateDailySalesReport = inngest.createFunction(
	{ id: "generate-daily-sales-report" },
	{ cron: "0 0 * * *" }, // Every day at midnight
	async ({ step }) => {
		await step.run("generate-report", async () => {
			// TODO: Aggregate daily sales and send report
			console.log("Generating daily sales report...")
		})

		return { success: true }
	}
)

// Scheduled: Data retention cleanup - runs daily at 3 AM
// Keeps database lean to minimize storage costs
export const dataRetentionCleanup = inngest.createFunction(
	{ id: "data-retention-cleanup" },
	{ cron: "0 3 * * *" },
	async ({ step }) => {
		const { db } = await import("@quickdash/db/client")
		const { lt, and, isNotNull, eq, or, inArray } = await import("@quickdash/db/drizzle")
		const schema = await import("@quickdash/db/schema")

		const now = new Date()
		const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

		// Delete read notifications older than 30 days
		const notifCount = await step.run("cleanup-notifications", async () => {
			const result = await db
				.delete(schema.notifications)
				.where(
					and(
						lt(schema.notifications.createdAt, daysAgo(30)),
						isNotNull(schema.notifications.readAt)
					)
				)
				.returning({ id: schema.notifications.id })
			return result.length
		})

		// Delete team messages older than 90 days (cascade deletes recipients)
		const msgCount = await step.run("cleanup-messages", async () => {
			const result = await db
				.delete(schema.teamMessages)
				.where(lt(schema.teamMessages.createdAt, daysAgo(90)))
				.returning({ id: schema.teamMessages.id })
			return result.length
		})

		// Delete replied/archived inbox emails older than 180 days
		const inboxCount = await step.run("cleanup-inbox", async () => {
			const result = await db
				.delete(schema.inboxEmails)
				.where(
					and(
						lt(schema.inboxEmails.receivedAt, daysAgo(180)),
						or(
							eq(schema.inboxEmails.status, "replied"),
							eq(schema.inboxEmails.status, "archived")
						)
					)
				)
				.returning({ id: schema.inboxEmails.id })
			return result.length
		})

		// Delete webhook events older than 30 days
		const webhookCount = await step.run("cleanup-webhooks", async () => {
			const result = await db
				.delete(schema.webhookEvents)
				.where(lt(schema.webhookEvents.createdAt, daysAgo(30)))
				.returning({ id: schema.webhookEvents.id })
			return result.length
		})

		// Delete stale presence records older than 1 day
		const presenceCount = await step.run("cleanup-presence", async () => {
			const result = await db
				.delete(schema.userPresence)
				.where(lt(schema.userPresence.lastSeenAt, daysAgo(1)))
				.returning({ id: schema.userPresence.id })
			return result.length
		})

		console.log("[Data Retention] Cleanup:", {
			notifications: notifCount,
			messages: msgCount,
			inbox: inboxCount,
			webhooks: webhookCount,
			presence: presenceCount,
		})

		return {
			success: true,
			deleted: { notifCount, msgCount, inboxCount, webhookCount, presenceCount }
		}
	}
)

// All functions to register with the serve handler
export const inngestFunctions = [
	// Core functions
	sendOrderConfirmation,
	sendLowStockAlert,
	sendSubscriptionReminder,
	processSubscriptionRenewal,
	checkExpiringSubscriptions,
	generateDailySalesReport,
	dataRetentionCleanup,
	// Webhook handlers
	...polarHandlers,
	...resendHandlers,
	// Outgoing webhooks
	webhookDeliver,
	webhookDeliveryCleanup,
	// Presence
	...presenceHandlers,
	// Auctions
	...auctionHandlers,
	// Workflow execution engine
	...workflowHandlers,
	// Email queue
	...emailHandlers,
]
