/**
 * Admin API - Orders
 *
 * GET /api/v1/orders - List orders
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count, gte, lte } from "@quickdash/db/drizzle"
import { orders, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	// Authenticate
	const auth = await authenticateAdminApi("readOrders")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	// Filters
	const status = searchParams.get("status")
	const userId = searchParams.get("user_id")
	const search = searchParams.get("search") // Order number
	const dateFrom = searchParams.get("date_from")
	const dateTo = searchParams.get("date_to")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		// Build conditions
		const conditions = [eq(orders.workspaceId, auth.workspace.id)]

		if (status) {
			conditions.push(eq(orders.status, status))
		}
		if (userId) {
			conditions.push(eq(orders.userId, userId))
		}
		if (search) {
			conditions.push(ilike(orders.orderNumber, `%${search}%`))
		}
		if (dateFrom) {
			conditions.push(gte(orders.createdAt, new Date(dateFrom)))
		}
		if (dateTo) {
			conditions.push(lte(orders.createdAt, new Date(dateTo)))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(orders)
			.where(and(...conditions))

		// Get orders with customer info
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn = sortBy === "total" ? orders.total :
			sortBy === "status" ? orders.status :
			sortBy === "updatedAt" ? orders.updatedAt :
			orders.createdAt

		const orderList = await db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				subtotal: orders.subtotal,
				taxAmount: orders.taxAmount,
				shippingAmount: orders.shippingAmount,
				discountAmount: orders.discountAmount,
				total: orders.total,
				userId: orders.userId,
				customerName: users.name,
				customerEmail: users.email,
				customerNotes: orders.customerNotes,
				internalNotes: orders.internalNotes,
				trackingNumber: orders.trackingNumber,
				trackingUrl: orders.trackingUrl,
				shippedAt: orders.shippedAt,
				deliveredAt: orders.deliveredAt,
				shippingAddressId: orders.shippingAddressId,
				billingAddressId: orders.billingAddressId,
				createdAt: orders.createdAt,
				updatedAt: orders.updatedAt,
			})
			.from(orders)
			.leftJoin(users, eq(orders.userId, users.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: orderList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List orders error:", error)
		return apiError("Failed to list orders", "INTERNAL_ERROR", 500)
	}
}
