"use server"

import { eq, and, desc, count, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { subscriptions, subscriptionItems, users, productVariants, products } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { fireWebhooks } from "@/lib/webhooks/outgoing"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireSubscriptionsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageOrders")
	if (!canManage) {
		throw new Error("You don't have permission to manage subscriptions")
	}
	return workspace
}

export async function bulkDeleteSubscriptions(ids: string[]) {
	const workspace = await requireSubscriptionsPermission()
	await db.delete(subscriptions).where(and(inArray(subscriptions.id, ids), eq(subscriptions.workspaceId, workspace.id)))
}

interface GetSubscriptionsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getSubscriptions(params: GetSubscriptionsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace
	const conditions = [eq(subscriptions.workspaceId, workspace.id)]
	if (status) {
		if (status === "cancelled") {
			conditions.push(eq(subscriptions.status, "cancelled"))
		} else {
			conditions.push(eq(subscriptions.status, status))
		}
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: subscriptions.id,
				userId: subscriptions.userId,
				status: subscriptions.status,
				frequency: subscriptions.frequency,
				pricePerDelivery: subscriptions.pricePerDelivery,
				nextDeliveryAt: subscriptions.nextDeliveryAt,
				lastDeliveryAt: subscriptions.lastDeliveryAt,
				totalDeliveries: subscriptions.totalDeliveries,
				cancelledAt: subscriptions.cancelledAt,
				cancellationReason: subscriptions.cancellationReason,
				createdAt: subscriptions.createdAt,
				customerName: users.name,
				customerEmail: users.email,
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(where)
			.orderBy(desc(subscriptions.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(subscriptions).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getSubscription(id: string) {
	const workspace = await requireWorkspace()

	const [sub] = await db
		.select({
			id: subscriptions.id,
			userId: subscriptions.userId,
			status: subscriptions.status,
			frequency: subscriptions.frequency,
			pricePerDelivery: subscriptions.pricePerDelivery,
			nextDeliveryAt: subscriptions.nextDeliveryAt,
			lastDeliveryAt: subscriptions.lastDeliveryAt,
			totalDeliveries: subscriptions.totalDeliveries,
			cancelledAt: subscriptions.cancelledAt,
			cancellationReason: subscriptions.cancellationReason,
			createdAt: subscriptions.createdAt,
			updatedAt: subscriptions.updatedAt,
			customerName: users.name,
			customerEmail: users.email,
		})
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspace.id)))
		.limit(1)

	if (!sub) return null

	const items = await db
		.select({
			id: subscriptionItems.id,
			quantity: subscriptionItems.quantity,
			variantId: subscriptionItems.variantId,
			variantName: productVariants.name,
			variantSku: productVariants.sku,
			productName: products.name,
			productPrice: products.price,
			variantPrice: productVariants.price,
		})
		.from(subscriptionItems)
		.innerJoin(productVariants, eq(subscriptionItems.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(eq(subscriptionItems.subscriptionId, id))

	return { ...sub, items }
}

export async function updateSubscriptionStatus(id: string, status: string) {
	const workspace = await requireSubscriptionsPermission()

	const updates: Record<string, unknown> = {
		status,
		updatedAt: new Date(),
	}

	if (status === "cancelled") {
		updates.cancelledAt = new Date()
		updates.nextDeliveryAt = null
	} else if (status === "active") {
		updates.cancelledAt = null
		updates.cancellationReason = null
	} else if (status === "paused") {
		updates.nextDeliveryAt = null
	}

	await db.update(subscriptions).set(updates).where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspace.id)))

	await logAudit({
		action: `subscription.${status}`,
		targetType: "subscription",
		targetId: id,
	})

	// Broadcast update
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "subscriptions"), "subscription:updated", {
			id,
			status,
			...(status === "cancelled" && { cancelledAt: new Date().toISOString() }),
		})
	}

	// Fire outgoing webhooks based on status
	if (status === "cancelled") {
		await fireWebhooks("subscription.cancelled", {
			subscriptionId: id,
			status,
			cancelledAt: new Date().toISOString(),
		}, workspace.id)
	} else if (status === "paused") {
		await fireWebhooks("subscription.paused", {
			subscriptionId: id,
			status,
		}, workspace.id)
	} else if (status === "active") {
		await fireWebhooks("subscription.resumed", {
			subscriptionId: id,
			status,
		}, workspace.id)
	}
}

export async function cancelSubscription(id: string, reason: string) {
	const workspace = await requireSubscriptionsPermission()

	const cancelledAt = new Date()

	await db
		.update(subscriptions)
		.set({
			status: "cancelled",
			cancelledAt,
			cancellationReason: reason,
			nextDeliveryAt: null,
			updatedAt: new Date(),
		})
		.where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspace.id)))

	await logAudit({
		action: "subscription.cancelled",
		targetType: "subscription",
		targetId: id,
		metadata: { reason },
	})

	// Broadcast cancellation
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "subscriptions"), "subscription:canceled", {
			id,
			cancelledAt: cancelledAt.toISOString(),
			reason,
		})
	}

	// Fire outgoing webhook
	await fireWebhooks("subscription.cancelled", {
		subscriptionId: id,
		status: "cancelled",
		cancelledAt: cancelledAt.toISOString(),
		reason,
	}, workspace.id)
}

export async function resumeSubscription(id: string) {
	const workspace = await requireSubscriptionsPermission()

	const nextDelivery = new Date()
	nextDelivery.setDate(nextDelivery.getDate() + 7)

	await db
		.update(subscriptions)
		.set({
			status: "active",
			cancelledAt: null,
			cancellationReason: null,
			nextDeliveryAt: nextDelivery,
			updatedAt: new Date(),
		})
		.where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspace.id)))

	await logAudit({
		action: "subscription.resumed",
		targetType: "subscription",
		targetId: id,
	})

	// Broadcast update
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "subscriptions"), "subscription:updated", {
			id,
			status: "active",
			cancelledAt: null,
			cancellationReason: null,
			nextDeliveryAt: nextDelivery.toISOString(),
		})
	}

	// Fire outgoing webhook
	await fireWebhooks("subscription.resumed", {
		subscriptionId: id,
		status: "active",
		nextDeliveryAt: nextDelivery.toISOString(),
	}, workspace.id)
}

export async function updateFrequency(id: string, frequency: string) {
	const workspace = await requireSubscriptionsPermission()

	await db
		.update(subscriptions)
		.set({ frequency, updatedAt: new Date() })
		.where(and(eq(subscriptions.id, id), eq(subscriptions.workspaceId, workspace.id)))

	await logAudit({
		action: "subscription.frequency_updated",
		targetType: "subscription",
		targetId: id,
		metadata: { frequency },
	})

	// Broadcast update
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "subscriptions"), "subscription:updated", {
			id,
			frequency,
		})
	}
}
