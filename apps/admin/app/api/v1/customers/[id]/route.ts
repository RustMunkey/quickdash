/**
 * Admin API - Customer Detail
 *
 * GET /api/v1/customers/[id] - Get customer with order summary
 * PATCH /api/v1/customers/[id] - Update customer info
 * DELETE /api/v1/customers/[id] - Not allowed (users are global)
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql } from "@quickdash/db/drizzle"
import { orders, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readCustomers")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		// Verify user is a customer of this workspace by checking orders
		const [orderStats] = await db
			.select({
				orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
				totalSpent: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)::text`,
				lastOrderAt: sql<Date>`MAX(${orders.createdAt})`,
				firstOrderAt: sql<Date>`MIN(${orders.createdAt})`,
			})
			.from(orders)
			.where(
				and(
					eq(orders.userId, id),
					eq(orders.workspaceId, auth.workspace.id)
				)
			)

		if (!orderStats || orderStats.orderCount === 0) {
			return apiError("Customer not found in this workspace", "NOT_FOUND", 404)
		}

		// Get user info
		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				phone: users.phone,
				image: users.image,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1)

		if (!user) {
			return apiError("Customer not found", "NOT_FOUND", 404)
		}

		return apiSuccess({
			data: {
				...user,
				orderCount: orderStats.orderCount,
				totalSpent: orderStats.totalSpent,
				lastOrderAt: orderStats.lastOrderAt,
				firstOrderAt: orderStats.firstOrderAt,
			},
		})
	} catch (error) {
		console.error("Admin API - Get customer error:", error)
		return apiError("Failed to get customer", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeCustomers")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify user is a customer of this workspace
		const [orderCheck] = await db
			.select({ userId: orders.userId })
			.from(orders)
			.where(
				and(
					eq(orders.userId, id),
					eq(orders.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!orderCheck) {
			return apiError("Customer not found in this workspace", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}
		if (body.name !== undefined) updates.name = body.name
		if (body.phone !== undefined) updates.phone = body.phone
		if (body.image !== undefined) updates.image = body.image

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update. Allowed: name, phone, image", "VALIDATION_ERROR", 400)
		}

		updates.updatedAt = new Date()

		const [user] = await db
			.update(users)
			.set(updates)
			.where(eq(users.id, id))
			.returning({
				id: users.id,
				name: users.name,
				email: users.email,
				phone: users.phone,
				image: users.image,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
			})

		return apiSuccess({ data: user })
	} catch (error) {
		console.error("Admin API - Update customer error:", error)
		return apiError("Failed to update customer", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE() {
	const auth = await authenticateAdminApi("writeCustomers")
	if (!auth.success) return auth.response

	return apiError(
		"Customer accounts cannot be deleted via API. Users are global accounts shared across workspaces.",
		"NOT_ALLOWED",
		400
	)
}
