"use server"

import { headers } from "next/headers"
import { eq, desc, and, isNull, or } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { notifications, notificationPreferences, alertRules } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"
import { getActiveWorkspace } from "@/lib/workspace"

async function requireUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")
	return session.user
}

// Fetch notifications for current user in current workspace (excludes dismissed)
export async function getNotifications(limit = 20, includeRead = false) {
	const user = await requireUser()
	const workspace = await getActiveWorkspace()

	const conditions = [
		eq(notifications.userId, user.id),
		isNull(notifications.dismissedAt), // Always exclude dismissed
		// Workspace-scoped: show notifications for current workspace OR platform-wide (null workspace)
		workspace
			? or(eq(notifications.workspaceId, workspace.id), isNull(notifications.workspaceId))
			: isNull(notifications.workspaceId),
	]
	if (!includeRead) {
		conditions.push(isNull(notifications.readAt))
	}

	return db
		.select()
		.from(notifications)
		.where(and(...conditions))
		.orderBy(desc(notifications.createdAt))
		.limit(limit)
}

// Get unread count for current workspace (excludes dismissed)
export async function getUnreadCount() {
	const user = await requireUser()
	const workspace = await getActiveWorkspace()

	const result = await db
		.select({ id: notifications.id })
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, user.id),
				isNull(notifications.readAt),
				isNull(notifications.dismissedAt),
				// Workspace-scoped
				workspace
					? or(eq(notifications.workspaceId, workspace.id), isNull(notifications.workspaceId))
					: isNull(notifications.workspaceId)
			)
		)

	return result.length
}

// Mark single notification as read
export async function markNotificationRead(notificationId: string) {
	const user = await requireUser()

	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, user.id)
			)
		)
}

// Mark all notifications as read (for current workspace)
export async function markAllNotificationsRead() {
	const user = await requireUser()
	const workspace = await getActiveWorkspace()

	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.userId, user.id),
				isNull(notifications.readAt),
				// Workspace-scoped
				workspace
					? or(eq(notifications.workspaceId, workspace.id), isNull(notifications.workspaceId))
					: isNull(notifications.workspaceId)
			)
		)
}

// Dismiss notification (hide from list)
export async function dismissNotification(notificationId: string) {
	const user = await requireUser()

	await db
		.update(notifications)
		.set({ dismissedAt: new Date() })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, user.id)
			)
		)
}

// Clear all notifications (for current workspace)
export async function clearAllNotifications() {
	const user = await requireUser()
	const workspace = await getActiveWorkspace()

	await db
		.update(notifications)
		.set({ dismissedAt: new Date() })
		.where(
			and(
				eq(notifications.userId, user.id),
				// Workspace-scoped
				workspace
					? or(eq(notifications.workspaceId, workspace.id), isNull(notifications.workspaceId))
					: isNull(notifications.workspaceId)
			)
		)
}

// Get notification preferences
export async function getNotificationPreferences() {
	const user = await requireUser()

	const [prefs] = await db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id))
		.limit(1)

	// Return defaults if no preferences exist
	if (!prefs) {
		return {
			newOrders: true,
			lowStock: true,
			payments: true,
			shipments: true,
			collaboration: true,
			sound: true,
			desktop: false,
			email: false,
		}
	}

	return {
		newOrders: prefs.newOrders,
		lowStock: prefs.lowStock,
		payments: prefs.payments,
		shipments: prefs.shipments,
		collaboration: prefs.collaboration,
		sound: prefs.sound,
		desktop: prefs.desktop,
		email: prefs.email,
	}
}

// Update notification preferences
export async function updateNotificationPreferences(preferences: {
	newOrders?: boolean
	lowStock?: boolean
	payments?: boolean
	shipments?: boolean
	collaboration?: boolean
	sound?: boolean
	desktop?: boolean
	email?: boolean
}) {
	const user = await requireUser()

	// Check if preferences exist
	const [existing] = await db
		.select({ id: notificationPreferences.id })
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id))
		.limit(1)

	if (existing) {
		await db
			.update(notificationPreferences)
			.set({
				...preferences,
				updatedAt: new Date(),
			})
			.where(eq(notificationPreferences.userId, user.id))
	} else {
		await db.insert(notificationPreferences).values({
			userId: user.id,
			...preferences,
		})
	}

	return getNotificationPreferences()
}

// Map granular alert types (e.g. "order.placed") to broad preference categories
const ALERT_TYPE_TO_PREFERENCE: Record<string, "newOrders" | "lowStock" | "payments" | "shipments" | "collaboration"> = {
	order: "newOrders",
	inventory: "lowStock",
	payment: "payments",
	subscription: "payments",
	shipping: "shipments",
	team: "collaboration",
	customer: "newOrders",
	review: "newOrders",
	marketing: "newOrders",
	// security and system alerts always go through - no mapping needed
}

function getPreferenceCategory(type: string) {
	const prefix = type.split(".")[0]
	return ALERT_TYPE_TO_PREFERENCE[prefix] ?? null
}

// Create a notification (utility for other parts of the app)
// workspaceId is optional - null means platform-wide notification (e.g., friend requests)
// Checks alertRules (workspace-level) and notificationPreferences (user-level) before creating
export async function createNotification(data: {
	userId: string
	workspaceId?: string | null
	type: string
	title: string
	body?: string
	link?: string
	metadata?: Record<string, unknown>
}) {
	// Check workspace-level alert rules (granular toggles like "order.placed")
	if (data.workspaceId) {
		const [rule] = await db
			.select({ isActive: alertRules.isActive })
			.from(alertRules)
			.where(
				and(
					eq(alertRules.workspaceId, data.workspaceId),
					eq(alertRules.type, data.type)
				)
			)
			.limit(1)

		// If a rule exists and is explicitly disabled, skip this notification
		if (rule && rule.isActive === false) {
			return null
		}
	}

	// Check user-level notification preferences (broad category toggles)
	const prefCategory = getPreferenceCategory(data.type)
	if (prefCategory) {
		const [prefs] = await db
			.select()
			.from(notificationPreferences)
			.where(eq(notificationPreferences.userId, data.userId))
			.limit(1)

		// If preferences exist and this category is disabled, skip
		if (prefs && prefs[prefCategory] === false) {
			return null
		}
	}

	const [notification] = await db
		.insert(notifications)
		.values({
			userId: data.userId,
			workspaceId: data.workspaceId ?? null,
			type: data.type,
			title: data.title,
			body: data.body,
			link: data.link,
			metadata: data.metadata,
		})
		.returning()

	// Broadcast via Pusher for real-time updates
	const { pusherServer } = await import("@/lib/pusher-server")
	if (pusherServer) {
		await pusherServer.trigger(`private-user-${data.userId}`, "notification", {
			id: notification.id,
			type: notification.type,
			title: notification.title,
			body: notification.body,
			link: notification.link,
			metadata: notification.metadata,
			workspaceId: notification.workspaceId,
			createdAt: notification.createdAt.toISOString(),
			readAt: null,
		})
	}

	return notification
}
