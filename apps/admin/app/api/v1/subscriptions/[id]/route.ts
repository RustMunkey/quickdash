/**
 * Admin API - Subscription Detail
 *
 * GET /api/v1/subscriptions/[id] - Get subscription with items
 * PATCH /api/v1/subscriptions/[id] - Update subscription status
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { subscriptions, subscriptionItems, productVariants, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readSubscriptions")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		// Get subscription with subscriber info
		const [subscription] = await db
			.select({
				id: subscriptions.id,
				userId: subscriptions.userId,
				subscriberName: users.name,
				subscriberEmail: users.email,
				status: subscriptions.status,
				frequency: subscriptions.frequency,
				shippingAddressId: subscriptions.shippingAddressId,
				pricePerDelivery: subscriptions.pricePerDelivery,
				nextDeliveryAt: subscriptions.nextDeliveryAt,
				lastDeliveryAt: subscriptions.lastDeliveryAt,
				totalDeliveries: subscriptions.totalDeliveries,
				cancelledAt: subscriptions.cancelledAt,
				cancellationReason: subscriptions.cancellationReason,
				createdAt: subscriptions.createdAt,
				updatedAt: subscriptions.updatedAt,
			})
			.from(subscriptions)
			.leftJoin(users, eq(subscriptions.userId, users.id))
			.where(
				and(
					eq(subscriptions.id, id),
					eq(subscriptions.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!subscription) {
			return apiError("Subscription not found", "NOT_FOUND", 404)
		}

		// Get subscription items with variant details
		const items = await db
			.select({
				id: subscriptionItems.id,
				variantId: subscriptionItems.variantId,
				quantity: subscriptionItems.quantity,
				variantName: productVariants.name,
				variantSku: productVariants.sku,
				variantPrice: productVariants.price,
			})
			.from(subscriptionItems)
			.leftJoin(productVariants, eq(subscriptionItems.variantId, productVariants.id))
			.where(eq(subscriptionItems.subscriptionId, id))

		return apiSuccess({
			data: {
				...subscription,
				items,
			},
		})
	} catch (error) {
		console.error("Admin API - Get subscription error:", error)
		return apiError("Failed to get subscription", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeSubscriptions")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify subscription exists and belongs to workspace
		const [existing] = await db
			.select({ id: subscriptions.id, status: subscriptions.status })
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.id, id),
					eq(subscriptions.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Subscription not found", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}

		if (body.status !== undefined) {
			const validStatuses = ["active", "paused", "cancelled", "dunning"]
			if (!validStatuses.includes(body.status)) {
				return apiError(
					`Invalid status. Must be one of: ${validStatuses.join(", ")}`,
					"VALIDATION_ERROR",
					400
				)
			}
			updates.status = body.status

			// If cancelling, set cancelledAt
			if (body.status === "cancelled") {
				updates.cancelledAt = new Date()
				if (body.cancellationReason) {
					updates.cancellationReason = body.cancellationReason
				}
			}
		}

		if (body.cancellationReason !== undefined && body.status !== "cancelled") {
			updates.cancellationReason = body.cancellationReason
		}

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		updates.updatedAt = new Date()

		const [subscription] = await db
			.update(subscriptions)
			.set(updates)
			.where(eq(subscriptions.id, id))
			.returning()

		return apiSuccess({ data: subscription })
	} catch (error) {
		console.error("Admin API - Update subscription error:", error)
		return apiError("Failed to update subscription", "INTERNAL_ERROR", 500)
	}
}
