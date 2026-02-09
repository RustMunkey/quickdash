import { inngest } from "../inngest"
import { pusherServer } from "../pusher-server"
import { db } from "@quickdash/db"
import { eq } from "@quickdash/db/drizzle"
import { notifications, workspaces, users } from "@quickdash/db/schema"
import { TIER_LIMITS, type SubscriptionTier } from "@quickdash/db/schema"
import { resolveSubscriptionTier } from "@/lib/polar"
import {
	markWebhookProcessed,
	updateWebhookStatus,
} from "../webhooks"
import type { PolarWebhookEvent, PolarOrder, PolarSubscription } from "../webhooks/polar"

/**
 * Find user by email address (for Polar webhook matching).
 */
async function findUserByEmail(email: string) {
	const [result] = await db
		.select({ userId: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1)
	return result || null
}

/**
 * Apply tier changes to a user and sync all their owned workspaces
 */
async function applyTier(userId: string, tier: SubscriptionTier, polarSubscriptionId: string, status: string) {
	const limits = TIER_LIMITS[tier]

	// Update user's subscription
	await db
		.update(users)
		.set({
			subscriptionTier: tier,
			subscriptionStatus: status,
			polarSubscriptionId,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))

	// Sync all owned workspaces with new limits
	await db
		.update(workspaces)
		.set({
			maxStorefronts: limits.storefronts,
			maxTeamMembers: limits.teamMembers,
			maxWidgets: limits.maxWidgets,
			maxSongs: limits.maxSongs,
			maxStations: limits.maxStations,
			features: limits.features,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.ownerId, userId))
}

/**
 * Notify user about subscription changes
 */
async function notifyUser(userId: string, title: string, body: string) {
	// Get user's first owned workspace for notification context
	const [ws] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, userId))
		.limit(1)

	if (!ws) return

	const [notification] = await db
		.insert(notifications)
		.values({
			userId,
			workspaceId: ws.id,
			type: "billing",
			title,
			body,
			link: "/billing",
		})
		.returning()

	if (pusherServer && notification) {
		await pusherServer.trigger(`private-user-${userId}`, "notification", {
			id: notification.id,
			type: "billing",
			title,
			body,
			link: "/billing",
			createdAt: notification.createdAt.toISOString(),
			readAt: null,
		})
	}
}

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
			const match = await findUserByEmail(order.user.email)
			if (!match) {
				console.log(`[Polar] No user found for ${order.user.email}`)
				return
			}
			console.log(`[Polar] Order ${order.id} processed for user ${match.userId}`)
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
			const match = await findUserByEmail(subscription.user.email)
			if (!match) {
				console.log(`[Polar] No user found for ${subscription.user.email}`)
				return
			}

			const tier = resolveSubscriptionTier(subscription.product_id)

			// Check if this is a promotional claim
			const metadata = (subscription as unknown as Record<string, unknown>).metadata as Record<string, string> | undefined
			if (metadata?.promo_code) {
				const { activatePromoClaim } = await import("@/app/pricing/actions")
				await activatePromoClaim(match.userId, subscription.id, metadata.promo_code)
				await notifyUser(
					match.userId,
					"Promo activated!",
					`Your introductory Essentials plan is now active. Enjoy all Essentials features for 3 months!`
				)
				console.log(`[Polar] Promo claim activated for user ${match.userId}`)
				return
			}

			await applyTier(match.userId, tier, subscription.id, "active")
			await notifyUser(
				match.userId,
				"Subscription activated",
				`You're now on the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`
			)
			console.log(`[Polar] User ${match.userId} upgraded to ${tier}`)
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
			const match = await findUserByEmail(subscription.user.email)
			if (!match) return

			const tier = resolveSubscriptionTier(subscription.product_id)
			await applyTier(match.userId, tier, subscription.id, "active")
			console.log(`[Polar] Subscription ${subscription.id} active for user ${match.userId}`)
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
			const match = await findUserByEmail(subscription.user.email)
			if (!match) return

			// Don't downgrade immediately — keep current tier until period ends
			// Polar sends subscription.revoked when access should actually be removed
			await db
				.update(users)
				.set({
					subscriptionStatus: "canceled",
					updatedAt: new Date(),
				})
				.where(eq(users.id, match.userId))

			await notifyUser(
				match.userId,
				"Subscription canceled",
				"Your plan will remain active until the end of the billing period."
			)
			console.log(`[Polar] Subscription ${subscription.id} canceled for user ${match.userId}`)
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
			const match = await findUserByEmail(subscription.user.email)
			if (!match) return

			// Downgrade user to hobby tier and sync all workspaces
			const hobbyLimits = TIER_LIMITS.hobby
			await db
				.update(users)
				.set({
					subscriptionTier: "hobby",
					subscriptionStatus: "active",
					polarSubscriptionId: null,
					updatedAt: new Date(),
				})
				.where(eq(users.id, match.userId))

			await db
				.update(workspaces)
				.set({
					maxStorefronts: hobbyLimits.storefronts,
					maxTeamMembers: hobbyLimits.teamMembers,
					maxWidgets: hobbyLimits.maxWidgets,
					maxSongs: hobbyLimits.maxSongs,
					maxStations: hobbyLimits.maxStations,
					features: hobbyLimits.features,
					updatedAt: new Date(),
				})
				.where(eq(workspaces.ownerId, match.userId))

			await notifyUser(
				match.userId,
				"Subscription ended",
				"Your account has been downgraded to the Free plan."
			)
			console.log(`[Polar] User ${match.userId} downgraded to free`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${subscription.id}-revoked`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, subscriptionId: subscription.id }
	}
)

// Process Polar subscription.updated webhook (handles dunning/past_due)
export const processPolarSubscriptionUpdated = inngest.createFunction(
	{ id: "process-polar-subscription-updated" },
	{ event: "polar/subscription.updated" },
	async ({ event, step }) => {
		const { webhookEventId, event: polarEvent } = event.data as {
			webhookEventId: string
			event: PolarWebhookEvent & { data: PolarSubscription }
		}

		const subscription = polarEvent.data

		await step.run("update-subscription", async () => {
			const match = await findUserByEmail(subscription.user.email)
			if (!match) return

			// Map Polar status to our internal status
			let status = "active"
			if (subscription.status === "past_due" || subscription.status === "unpaid") {
				status = "past_due"
			} else if (subscription.status === "canceled") {
				status = "canceled"
			}

			const tier = resolveSubscriptionTier(subscription.product_id)
			const limits = TIER_LIMITS[tier]

			// Update user subscription
			await db
				.update(users)
				.set({
					subscriptionTier: tier,
					subscriptionStatus: status,
					polarSubscriptionId: subscription.id,
					updatedAt: new Date(),
				})
				.where(eq(users.id, match.userId))

			// Sync workspaces with new tier limits
			await db
				.update(workspaces)
				.set({
					maxStorefronts: limits.storefronts,
					maxTeamMembers: limits.teamMembers,
					maxWidgets: limits.maxWidgets,
					maxSongs: limits.maxSongs,
					maxStations: limits.maxStations,
					features: limits.features,
					updatedAt: new Date(),
				})
				.where(eq(workspaces.ownerId, match.userId))

			if (status === "past_due") {
				await notifyUser(
					match.userId,
					"Payment failed",
					"Your subscription payment failed. Please update your payment method to avoid losing access."
				)
			}

			console.log(`[Polar] Subscription ${subscription.id} updated to ${status} for user ${match.userId}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${subscription.id}-updated-${subscription.status}`)
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
			console.log(`[Polar] Checkout ${checkout.id} status: ${checkout.status}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("polar", `${checkout.id}-${checkout.status}`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, checkoutId: checkout.id }
	}
)

/**
 * Cron job: check for expired intro promo subscriptions and downgrade
 * Runs daily at midnight UTC
 */
export const promoExpirationCheck = inngest.createFunction(
	{
		id: "promo-expiration-check",
		name: "Promo Expiration Check",
	},
	{ cron: "0 0 * * *" }, // Daily at midnight UTC
	async ({ step }) => {
		const { promotionalClaims } = await import("@quickdash/db/schema")
		const { and, lte } = await import("@quickdash/db/drizzle")

		// Find all active promos that have expired
		const expiredPromos = await step.run("find-expired-promos", async () => {
			return db
				.select({
					id: promotionalClaims.id,
					userId: promotionalClaims.userId,
					promoCode: promotionalClaims.promoCode,
					polarSubscriptionId: promotionalClaims.polarSubscriptionId,
				})
				.from(promotionalClaims)
				.where(
					and(
						eq(promotionalClaims.isActive, true),
						lte(promotionalClaims.expiresAt, new Date())
					)
				)
		})

		if (expiredPromos.length === 0) {
			return { expired: 0 }
		}

		let downgraded = 0

		for (const promo of expiredPromos) {
			await step.run(`downgrade-${promo.id}`, async () => {
				// Mark promo as inactive
				await db
					.update(promotionalClaims)
					.set({ isActive: false })
					.where(eq(promotionalClaims.id, promo.id))

				// Downgrade user to hobby
				const hobbyLimits = TIER_LIMITS.hobby
				await db
					.update(users)
					.set({
						subscriptionTier: "hobby",
						subscriptionStatus: "active",
						polarSubscriptionId: null,
						updatedAt: new Date(),
					})
					.where(eq(users.id, promo.userId))

				// Sync all owned workspaces to hobby limits
				await db
					.update(workspaces)
					.set({
						maxStorefronts: hobbyLimits.storefronts,
						maxTeamMembers: hobbyLimits.teamMembers,
						maxWidgets: hobbyLimits.maxWidgets,
						maxSongs: hobbyLimits.maxSongs,
						maxStations: hobbyLimits.maxStations,
						features: hobbyLimits.features,
						updatedAt: new Date(),
					})
					.where(eq(workspaces.ownerId, promo.userId))

				// Notify user
				await notifyUser(
					promo.userId,
					"Intro offer expired",
					"Your introductory Essentials plan has ended. Upgrade to continue using Essentials features."
				)

				// Cancel the Polar subscription if we have the ID
				if (promo.polarSubscriptionId) {
					const { POLAR_API_BASE } = await import("@/lib/polar")
					await fetch(`${POLAR_API_BASE}/subscriptions/${promo.polarSubscriptionId}`, {
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
						},
					}).catch(() => {})
				}

				downgraded++
				console.log(`[Promo] Downgraded user ${promo.userId} — intro offer expired`)
			})
		}

		return { expired: expiredPromos.length, downgraded }
	}
)

export const polarHandlers = [
	processPolarOrder,
	processPolarSubscriptionCreated,
	processPolarSubscriptionActive,
	processPolarSubscriptionUpdated,
	processPolarSubscriptionCanceled,
	processPolarSubscriptionRevoked,
	processPolarCheckoutUpdated,
	promoExpirationCheck,
]
