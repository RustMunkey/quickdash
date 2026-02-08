/**
 * Admin API - Webhooks
 *
 * GET /api/v1/webhooks - List webhook endpoints
 * POST /api/v1/webhooks - Create webhook endpoint
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, count } from "@quickdash/db/drizzle"
import { outgoingWebhookEndpoints, outgoingWebhookDeliveries } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

export async function GET(request: NextRequest) {
	// Authenticate
	const auth = await authenticateAdminApi("readWebhooks")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	try {
		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(outgoingWebhookEndpoints)
			.where(eq(outgoingWebhookEndpoints.workspaceId, auth.workspace.id))

		// Get webhooks
		const webhooks = await db
			.select()
			.from(outgoingWebhookEndpoints)
			.where(eq(outgoingWebhookEndpoints.workspaceId, auth.workspace.id))
			.orderBy(desc(outgoingWebhookEndpoints.createdAt))
			.limit(limit)
			.offset(offset)

		// Mask secrets in response
		const sanitizedWebhooks = webhooks.map(webhook => ({
			...webhook,
			secret: `${webhook.secret.slice(0, 8)}...${webhook.secret.slice(-4)}`,
		}))

		return apiSuccess({
			data: sanitizedWebhooks,
			meta: buildPaginationMeta(Number(total), page, limit),
			availableEvents: WEBHOOK_EVENTS,
		})
	} catch (error) {
		console.error("Admin API - List webhooks error:", error)
		return apiError("Failed to list webhooks", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	// Authenticate
	const auth = await authenticateAdminApi("writeWebhooks")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		// Validate required fields
		if (!body.name || typeof body.name !== "string") {
			return apiError("Webhook name is required", "VALIDATION_ERROR", 400)
		}
		if (!body.url || typeof body.url !== "string") {
			return apiError("Webhook URL is required", "VALIDATION_ERROR", 400)
		}
		if (!body.url.startsWith("https://")) {
			return apiError("Webhook URL must use HTTPS", "VALIDATION_ERROR", 400)
		}
		if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
			return apiError("At least one event subscription is required", "VALIDATION_ERROR", 400)
		}

		// Validate events
		const validEvents = new Set([...Object.keys(WEBHOOK_EVENTS), "*"])
		for (const event of body.events) {
			if (!validEvents.has(event)) {
				return apiError(`Invalid event: ${event}`, "VALIDATION_ERROR", 400)
			}
		}

		// Generate secret
		const secret = `whsec_${nanoid(48)}`

		// Create webhook
		const [webhook] = await db
			.insert(outgoingWebhookEndpoints)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				url: body.url,
				secret,
				events: body.events,
				headers: body.headers || {},
				isActive: body.isActive !== false,
			})
			.returning()

		// Return with full secret (only shown once)
		return apiSuccess({
			data: {
				...webhook,
				// Show full secret only on creation
			},
			message: "Webhook created. Save the secret - it won't be shown again.",
		}, 201)
	} catch (error) {
		console.error("Admin API - Create webhook error:", error)
		return apiError("Failed to create webhook", "INTERNAL_ERROR", 500)
	}
}
