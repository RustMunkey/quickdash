/**
 * Admin API - Single Webhook
 *
 * GET /api/v1/webhooks/:id - Get webhook details with recent deliveries
 * PATCH /api/v1/webhooks/:id - Update webhook
 * DELETE /api/v1/webhooks/:id - Delete webhook
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import { outgoingWebhookEndpoints, outgoingWebhookDeliveries } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"
import { nanoid } from "nanoid"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("readWebhooks")
	if (!auth.success) return auth.response

	try {
		// Get webhook
		const [webhook] = await db
			.select()
			.from(outgoingWebhookEndpoints)
			.where(
				and(
					eq(outgoingWebhookEndpoints.id, id),
					eq(outgoingWebhookEndpoints.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!webhook) {
			return apiError("Webhook not found", "NOT_FOUND", 404)
		}

		// Get recent deliveries
		const deliveries = await db
			.select()
			.from(outgoingWebhookDeliveries)
			.where(eq(outgoingWebhookDeliveries.endpointId, id))
			.orderBy(desc(outgoingWebhookDeliveries.createdAt))
			.limit(20)

		return apiSuccess({
			data: {
				...webhook,
				secret: `${webhook.secret.slice(0, 8)}...${webhook.secret.slice(-4)}`,
				recentDeliveries: deliveries,
			},
		})
	} catch (error) {
		console.error("Admin API - Get webhook error:", error)
		return apiError("Failed to get webhook", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("writeWebhooks")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select()
			.from(outgoingWebhookEndpoints)
			.where(
				and(
					eq(outgoingWebhookEndpoints.id, id),
					eq(outgoingWebhookEndpoints.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Webhook not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (body.name !== undefined) {
			updateData.name = body.name
		}
		if (body.url !== undefined) {
			if (!body.url.startsWith("https://")) {
				return apiError("Webhook URL must use HTTPS", "VALIDATION_ERROR", 400)
			}
			updateData.url = body.url
		}
		if (body.events !== undefined) {
			// Validate events
			const validEvents = new Set([...Object.keys(WEBHOOK_EVENTS), "*"])
			for (const event of body.events) {
				if (!validEvents.has(event)) {
					return apiError(`Invalid event: ${event}`, "VALIDATION_ERROR", 400)
				}
			}
			updateData.events = body.events
		}
		if (body.headers !== undefined) {
			updateData.headers = body.headers
		}
		if (body.isActive !== undefined) {
			updateData.isActive = body.isActive
		}

		// Regenerate secret if requested
		let newSecret: string | undefined
		if (body.regenerateSecret === true) {
			newSecret = `whsec_${nanoid(48)}`
			updateData.secret = newSecret
		}

		// Update webhook
		const [updated] = await db
			.update(outgoingWebhookEndpoints)
			.set(updateData)
			.where(eq(outgoingWebhookEndpoints.id, id))
			.returning()

		return apiSuccess({
			data: {
				...updated,
				secret: newSecret || `${updated.secret.slice(0, 8)}...${updated.secret.slice(-4)}`,
			},
			...(newSecret && { message: "Secret regenerated. Save the new secret - it won't be shown again." }),
		})
	} catch (error) {
		console.error("Admin API - Update webhook error:", error)
		return apiError("Failed to update webhook", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("writeWebhooks")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: outgoingWebhookEndpoints.id })
			.from(outgoingWebhookEndpoints)
			.where(
				and(
					eq(outgoingWebhookEndpoints.id, id),
					eq(outgoingWebhookEndpoints.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Webhook not found", "NOT_FOUND", 404)
		}

		// Delete webhook (cascade will delete deliveries)
		await db.delete(outgoingWebhookEndpoints).where(eq(outgoingWebhookEndpoints.id, id))

		return apiSuccess({ message: "Webhook deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete webhook error:", error)
		return apiError("Failed to delete webhook", "INTERNAL_ERROR", 500)
	}
}
