"use server"

import { eq, desc, count, and } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import {
	incomingWebhookUrls,
	outgoingWebhookEndpoints,
	outgoingWebhookDeliveries,
	webhookEvents,
} from "@quickdash/db/schema"
import { nanoid } from "nanoid"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireWebhooksPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage webhooks")
	}
	return workspace
}

// ==============================================
// INCOMING WEBHOOKS (Discord-style messaging)
// ==============================================

export async function getIncomingWebhooks() {
	const workspace = await requireWebhooksPermission()

	return db
		.select()
		.from(incomingWebhookUrls)
		.where(eq(incomingWebhookUrls.workspaceId, workspace.id))
		.orderBy(desc(incomingWebhookUrls.createdAt))
}

export async function createIncomingWebhook(data: {
	name: string
	channel: string
	defaultUsername?: string
	defaultAvatarUrl?: string
}) {
	const workspace = await requireWebhooksPermission()

	const token = nanoid(32) // Secure random token

	const [webhook] = await db
		.insert(incomingWebhookUrls)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			token,
			channel: data.channel,
			defaultUsername: data.defaultUsername,
			defaultAvatarUrl: data.defaultAvatarUrl,
		})
		.returning()

	return webhook
}

export async function updateIncomingWebhook(
	id: string,
	data: {
		name?: string
		channel?: string
		defaultUsername?: string
		defaultAvatarUrl?: string
		isActive?: boolean
	}
) {
	const workspace = await requireWebhooksPermission()

	await db
		.update(incomingWebhookUrls)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(incomingWebhookUrls.id, id), eq(incomingWebhookUrls.workspaceId, workspace.id)))
}

export async function deleteIncomingWebhook(id: string) {
	const workspace = await requireWebhooksPermission()

	await db.delete(incomingWebhookUrls).where(and(eq(incomingWebhookUrls.id, id), eq(incomingWebhookUrls.workspaceId, workspace.id)))
}

export async function regenerateIncomingWebhookToken(id: string) {
	const workspace = await requireWebhooksPermission()

	const newToken = nanoid(32)

	await db
		.update(incomingWebhookUrls)
		.set({
			token: newToken,
			updatedAt: new Date(),
		})
		.where(and(eq(incomingWebhookUrls.id, id), eq(incomingWebhookUrls.workspaceId, workspace.id)))

	return newToken
}

// ==============================================
// OUTGOING WEBHOOKS
// ==============================================

export async function getOutgoingWebhooks() {
	const workspace = await requireWebhooksPermission()

	return db
		.select()
		.from(outgoingWebhookEndpoints)
		.where(eq(outgoingWebhookEndpoints.workspaceId, workspace.id))
		.orderBy(desc(outgoingWebhookEndpoints.createdAt))
}

export async function createOutgoingWebhook(data: {
	name: string
	url: string
	events: string[]
	headers?: Record<string, string>
}) {
	const workspace = await requireWebhooksPermission()

	// Generate a secret for signing
	const secret = nanoid(48)

	const [webhook] = await db
		.insert(outgoingWebhookEndpoints)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			url: data.url,
			secret,
			events: data.events,
			headers: data.headers || {},
		})
		.returning()

	return webhook
}

export async function updateOutgoingWebhook(
	id: string,
	data: {
		name?: string
		url?: string
		events?: string[]
		headers?: Record<string, string>
		isActive?: boolean
	}
) {
	const workspace = await requireWebhooksPermission()

	await db
		.update(outgoingWebhookEndpoints)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(outgoingWebhookEndpoints.id, id), eq(outgoingWebhookEndpoints.workspaceId, workspace.id)))
}

export async function deleteOutgoingWebhook(id: string) {
	const workspace = await requireWebhooksPermission()

	await db.delete(outgoingWebhookEndpoints).where(and(eq(outgoingWebhookEndpoints.id, id), eq(outgoingWebhookEndpoints.workspaceId, workspace.id)))
}

export async function regenerateOutgoingWebhookSecret(id: string) {
	const workspace = await requireWebhooksPermission()

	const newSecret = nanoid(48)

	await db
		.update(outgoingWebhookEndpoints)
		.set({
			secret: newSecret,
			updatedAt: new Date(),
		})
		.where(and(eq(outgoingWebhookEndpoints.id, id), eq(outgoingWebhookEndpoints.workspaceId, workspace.id)))

	return newSecret
}

// ==============================================
// DELIVERY LOGS
// ==============================================

interface GetDeliveryLogsParams {
	page?: number
	pageSize?: number
	endpointId?: string
	status?: string
}

export async function getDeliveryLogs(params: GetDeliveryLogsParams = {}) {
	const workspace = await requireWebhooksPermission()

	const { page = 1, pageSize = 25, endpointId, status } = params
	const offset = (page - 1) * pageSize

	// Filter by workspace through endpoints
	const conditions = [eq(outgoingWebhookEndpoints.workspaceId, workspace.id)]
	if (endpointId) {
		conditions.push(eq(outgoingWebhookDeliveries.endpointId, endpointId))
	}
	if (status) {
		conditions.push(eq(outgoingWebhookDeliveries.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: outgoingWebhookDeliveries.id,
				endpointId: outgoingWebhookDeliveries.endpointId,
				endpointName: outgoingWebhookEndpoints.name,
				event: outgoingWebhookDeliveries.event,
				status: outgoingWebhookDeliveries.status,
				responseCode: outgoingWebhookDeliveries.responseCode,
				attempts: outgoingWebhookDeliveries.attempts,
				errorMessage: outgoingWebhookDeliveries.errorMessage,
				createdAt: outgoingWebhookDeliveries.createdAt,
				deliveredAt: outgoingWebhookDeliveries.deliveredAt,
			})
			.from(outgoingWebhookDeliveries)
			.innerJoin(
				outgoingWebhookEndpoints,
				eq(outgoingWebhookDeliveries.endpointId, outgoingWebhookEndpoints.id)
			)
			.where(where)
			.orderBy(desc(outgoingWebhookDeliveries.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(outgoingWebhookDeliveries)
			.innerJoin(
				outgoingWebhookEndpoints,
				eq(outgoingWebhookDeliveries.endpointId, outgoingWebhookEndpoints.id)
			)
			.where(where),
	])

	return { items, totalCount: total.count }
}

export async function getDeliveryDetails(id: string) {
	const workspace = await requireWebhooksPermission()

	const [delivery] = await db
		.select({
			id: outgoingWebhookDeliveries.id,
			endpointId: outgoingWebhookDeliveries.endpointId,
			event: outgoingWebhookDeliveries.event,
			payload: outgoingWebhookDeliveries.payload,
			status: outgoingWebhookDeliveries.status,
			responseCode: outgoingWebhookDeliveries.responseCode,
			responseBody: outgoingWebhookDeliveries.responseBody,
			attempts: outgoingWebhookDeliveries.attempts,
			errorMessage: outgoingWebhookDeliveries.errorMessage,
			createdAt: outgoingWebhookDeliveries.createdAt,
			deliveredAt: outgoingWebhookDeliveries.deliveredAt,
		})
		.from(outgoingWebhookDeliveries)
		.innerJoin(
			outgoingWebhookEndpoints,
			eq(outgoingWebhookDeliveries.endpointId, outgoingWebhookEndpoints.id)
		)
		.where(and(eq(outgoingWebhookDeliveries.id, id), eq(outgoingWebhookEndpoints.workspaceId, workspace.id)))
		.limit(1)

	return delivery
}

export async function retryDelivery(id: string) {
	const workspace = await requireWebhooksPermission()

	const [delivery] = await db
		.select()
		.from(outgoingWebhookDeliveries)
		.where(eq(outgoingWebhookDeliveries.id, id))
		.limit(1)

	if (!delivery) throw new Error("Delivery not found")

	const [endpoint] = await db
		.select()
		.from(outgoingWebhookEndpoints)
		.where(and(eq(outgoingWebhookEndpoints.id, delivery.endpointId), eq(outgoingWebhookEndpoints.workspaceId, workspace.id)))
		.limit(1)

	if (!endpoint) throw new Error("Endpoint not found")

	// Import inngest dynamically to avoid circular deps
	const { inngest } = await import("@/lib/inngest")

	await inngest.send({
		name: "webhook/deliver",
		data: {
			deliveryId: delivery.id,
			endpointId: endpoint.id,
			url: endpoint.url,
			secret: endpoint.secret,
			headers: endpoint.headers,
			payload: delivery.payload,
		},
	})

	// Reset status to pending
	await db
		.update(outgoingWebhookDeliveries)
		.set({ status: "pending" })
		.where(eq(outgoingWebhookDeliveries.id, id))

	return { queued: true }
}

// ==============================================
// WEBHOOK EVENTS LOG (incoming webhooks)
// ==============================================

interface GetWebhookEventsParams {
	page?: number
	pageSize?: number
	provider?: string
	status?: string
}

export async function getWebhookEvents(params: GetWebhookEventsParams = {}) {
	// Note: webhookEvents are platform-wide (incoming from Stripe, etc.)
	// They don't have workspaceId - they get routed based on event content
	// For now, only allow owners to view them
	await requireWebhooksPermission()

	const { page = 1, pageSize = 25, provider, status } = params
	const offset = (page - 1) * pageSize

	const conditions = []
	if (provider) {
		conditions.push(eq(webhookEvents.provider, provider))
	}
	if (status) {
		conditions.push(eq(webhookEvents.status, status))
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: webhookEvents.id,
				provider: webhookEvents.provider,
				eventType: webhookEvents.eventType,
				status: webhookEvents.status,
				errorMessage: webhookEvents.errorMessage,
				createdAt: webhookEvents.createdAt,
				processedAt: webhookEvents.processedAt,
			})
			.from(webhookEvents)
			.where(where)
			.orderBy(desc(webhookEvents.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(webhookEvents)
			.where(where),
	])

	return { items, totalCount: total.count }
}
