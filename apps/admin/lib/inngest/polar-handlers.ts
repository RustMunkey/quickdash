import { inngest } from "../inngest"
import { pusherServer } from "../pusher-server"
import { wsChannel } from "../pusher-channels"
import { db } from "@quickdash/db"
import { notifications, workspaces } from "@quickdash/db/schema"
import {
	markWebhookProcessed,
	updateWebhookStatus,
} from "../webhooks"
import type { PolarWebhookEvent, PolarOrder, PolarSubscription } from "../webhooks/polar"

// Process Polar order.created webhook
export const processPolarOrder = inngest.createFunction(
	{ id: "process-polar-order" },
	{ event: "polar/order.created" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarOrder }
		}

		const order = polarEvent.data

		await step.run("process-order", async () => {
			// TODO: Match Polar customer to internal user via email
			// TODO: Create or update internal order record
			console.log(`Processing Polar order ${order.id} from ${order.user.email}`)
		})

		await step.run("broadcast-order", async () => {
			// Broadcast complete order data to all admins for live updates
			if (pusherServer) {
				const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
				if (workspace) {
					await pusherServer.trigger(wsChannel(workspace.id, "orders"), "order:created", {
						id: order.id,
						orderNumber: order.id.slice(0, 8).toUpperCase(),
						status: "pending",
						total: (order.amount / 100).toFixed(2),
						customerName: order.user.public_name || null,
						customerEmail: order.user.email,
						createdAt: order.created_at,
					})
				}
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", order.id)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, orderId: order.id }
	}
)

// Process Polar subscription.created webhook
export const processPolarSubscriptionCreated = inngest.createFunction(
	{ id: "process-polar-subscription-created" },
	{ event: "polar/subscription.created" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarSubscription }
		}

		const subscription = polarEvent.data

		await step.run("process-subscription", async () => {
			// TODO: Create or update internal subscription record
			console.log(`New subscription ${subscription.id} from ${subscription.user.email}`)
		})

		await step.run("broadcast-subscription", async () => {
			if (pusherServer) {
				const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
				if (workspace) {
					await pusherServer.trigger(wsChannel(workspace.id, "orders"), "subscription:created", {
						subscriptionId: subscription.id,
						customerEmail: subscription.user.email,
						customerName: subscription.user.public_name || null,
						product: subscription.product.name,
						status: subscription.status,
						amount: subscription.price.price_amount || 0,
						currency: subscription.price.price_currency,
					})
				}
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", subscription.id)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, subscriptionId: subscription.id }
	}
)

// Process Polar subscription.active webhook
export const processPolarSubscriptionActive = inngest.createFunction(
	{ id: "process-polar-subscription-active" },
	{ event: "polar/subscription.active" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarSubscription }
		}

		const subscription = polarEvent.data

		await step.run("activate-subscription", async () => {
			// TODO: Update internal subscription status
			// TODO: Grant benefits/access
			console.log(`Subscription ${subscription.id} activated`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${subscription.id}-active`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, subscriptionId: subscription.id }
	}
)

// Process Polar subscription.canceled webhook
export const processPolarSubscriptionCanceled = inngest.createFunction(
	{ id: "process-polar-subscription-canceled" },
	{ event: "polar/subscription.canceled" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarSubscription }
		}

		const subscription = polarEvent.data

		await step.run("cancel-subscription", async () => {
			// TODO: Update internal subscription status
			// TODO: Handle end-of-period access
			console.log(`Subscription ${subscription.id} canceled by ${subscription.user.email}`)
		})

		await step.run("notify-team", async () => {
			if (pusherServer) {
				const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
				if (workspace) {
					await pusherServer.trigger(wsChannel(workspace.id, "orders"), "subscription:canceled", {
						subscriptionId: subscription.id,
						customerEmail: subscription.user.email,
						product: subscription.product.name,
					})
				}
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${subscription.id}-canceled`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, subscriptionId: subscription.id }
	}
)

// Process Polar subscription.revoked webhook
export const processPolarSubscriptionRevoked = inngest.createFunction(
	{ id: "process-polar-subscription-revoked" },
	{ event: "polar/subscription.revoked" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarSubscription }
		}

		const subscription = polarEvent.data

		await step.run("revoke-subscription", async () => {
			// TODO: Immediately revoke access
			// TODO: Update internal subscription status
			console.log(`Subscription ${subscription.id} revoked for ${subscription.user.email}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${subscription.id}-revoked`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, subscriptionId: subscription.id }
	}
)

// Process Polar checkout.updated webhook
export const processPolarCheckoutUpdated = inngest.createFunction(
	{ id: "process-polar-checkout-updated" },
	{ event: "polar/checkout.updated" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent
		}

		const checkout = polarEvent.data as { id: string; status: string }

		await step.run("handle-checkout-update", async () => {
			// Track checkout status for analytics
			console.log(`Checkout ${checkout.id} status: ${checkout.status}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${checkout.id}-${checkout.status}`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, checkoutId: checkout.id }
	}
)

export const polarHandlers = [
	processPolarOrder,
	processPolarSubscriptionCreated,
	processPolarSubscriptionActive,
	processPolarSubscriptionCanceled,
	processPolarSubscriptionRevoked,
	processPolarCheckoutUpdated,
]
