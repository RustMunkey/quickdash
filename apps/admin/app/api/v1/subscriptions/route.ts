/**
 * Admin API - Subscriptions
 *
 * GET /api/v1/subscriptions - List subscriptions
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count } from "@quickdash/db/drizzle"
import { subscriptions, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readSubscriptions")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const status = searchParams.get("status") // active, paused, cancelled, dunning
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(subscriptions.workspaceId, auth.workspace.id)]

		if (status) {
			conditions.push(eq(subscriptions.status, status))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(subscriptions)
			.where(and(...conditions))

		// Get subscriptions with subscriber info
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "status"
				? subscriptions.status
				: sortBy === "nextDeliveryAt"
					? subscriptions.nextDeliveryAt
					: sortBy === "pricePerDelivery"
						? subscriptions.pricePerDelivery
						: subscriptions.createdAt

		const subscriptionList = await db
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
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: subscriptionList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List subscriptions error:", error)
		return apiError("Failed to list subscriptions", "INTERNAL_ERROR", 500)
	}
}
