/**
 * Admin API - Customers
 *
 * GET /api/v1/customers - List customers (users who have ordered from workspace)
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, sql } from "@quickdash/db/drizzle"
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
	const auth = await authenticateAdminApi("readCustomers")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	// Filters
	const search = searchParams.get("search")
	const sortBy = searchParams.get("sort_by") || "totalSpent"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		// Get total unique customers
		const [{ total }] = await db
			.select({ total: sql<number>`COUNT(DISTINCT ${orders.userId})::int` })
			.from(orders)
			.where(eq(orders.workspaceId, auth.workspace.id))

		// Get paginated results with sorting
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortExpression = sortBy === "name" ? users.name :
			sortBy === "email" ? users.email :
			sortBy === "orderCount" ? sql`COUNT(DISTINCT ${orders.id})` :
			sortBy === "lastOrderAt" ? sql`MAX(${orders.createdAt})` :
			sql`COALESCE(SUM(${orders.total}::numeric), 0)`

		const customers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				phone: users.phone,
				image: users.image,
				createdAt: users.createdAt,
				orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`.as("order_count"),
				totalSpent: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)::text`.as("total_spent"),
				lastOrderAt: sql<Date>`MAX(${orders.createdAt})`.as("last_order_at"),
			})
			.from(orders)
			.innerJoin(users, eq(orders.userId, users.id))
			.where(
				search
					? and(
							eq(orders.workspaceId, auth.workspace.id),
							ilike(users.email, `%${search}%`)
						)
					: eq(orders.workspaceId, auth.workspace.id)
			)
			.groupBy(users.id, users.name, users.email, users.phone, users.image, users.createdAt)
			.orderBy(orderFn(sortExpression))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: customers,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List customers error:", error)
		return apiError("Failed to list customers", "INTERNAL_ERROR", 500)
	}
}
