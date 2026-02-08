import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, sql } from "@quickdash/db/drizzle"
import { orders, users } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)

	// Customer ID is required - storefronts can only query orders for a specific customer
	const customerId = searchParams.get("customer_id")
	if (!customerId) {
		return storefrontError("customer_id query parameter is required", 400)
	}

	// Pagination
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")))
	const offset = (page - 1) * limit

	// Optional status filter
	const status = searchParams.get("status")

	// Build conditions
	const conditions = [
		eq(orders.workspaceId, storefront.workspaceId),
		eq(orders.userId, customerId),
	]

	if (status) {
		conditions.push(eq(orders.status, status))
	}

	// Execute query
	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				subtotal: orders.subtotal,
				taxAmount: orders.taxAmount,
				shippingAmount: orders.shippingAmount,
				total: orders.total,
				trackingNumber: orders.trackingNumber,
				trackingUrl: orders.trackingUrl,
				createdAt: orders.createdAt,
				shippedAt: orders.shippedAt,
				deliveredAt: orders.deliveredAt,
			})
			.from(orders)
			.where(and(...conditions))
			.orderBy(desc(orders.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(orders)
			.where(and(...conditions)),
	])

	const totalCount = Number(countResult.count)
	const totalPages = Math.ceil(totalCount / limit)

	return Response.json({
		orders: items,
		pagination: {
			page,
			limit,
			totalCount,
			totalPages,
			hasMore: page < totalPages,
		},
	})
}

export const GET = withStorefrontAuth(handleGet, { requiredPermission: "orders" })
export const OPTIONS = handleCorsOptions
