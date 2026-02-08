"use server"

import { eq, desc, sql, count, and, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { users, orders, customerSegments, customerSegmentMembers, loyaltyPoints } from "@quickdash/db/schema"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireCustomersPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageCustomers")
	if (!canManage) {
		throw new Error("You don't have permission to manage customers")
	}
	return workspace
}

export async function bulkDeleteCustomers(ids: string[]) {
	const workspace = await requireCustomersPermission()
	// Delete orders for these customers in this workspace, then remove user references
	await db.delete(orders).where(and(inArray(orders.userId, ids), eq(orders.workspaceId, workspace.id)))
}

interface GetCustomersParams {
	page?: number
	pageSize?: number
	search?: string
	segment?: string
}

export async function getCustomers(params: GetCustomersParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search, segment } = params
	const offset = (page - 1) * pageSize

	// Get customers who have placed orders in this workspace
	// Subquery to find users who have orders in this workspace
	const workspaceCustomersSubquery = db
		.selectDistinct({ userId: orders.userId })
		.from(orders)
		.where(eq(orders.workspaceId, workspace.id))

	const baseConditions = [inArray(users.id, workspaceCustomersSubquery)]
	if (search) {
		baseConditions.push(
			sql`(${users.name} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`})`
		)
	}

	// If filtering by segment, add the segment condition (segments are workspace-scoped)
	if (segment) {
		const segmentSubquery = db
			.select({ userId: customerSegmentMembers.userId })
			.from(customerSegmentMembers)
			.innerJoin(customerSegments, eq(customerSegments.id, customerSegmentMembers.segmentId))
			.where(and(
				eq(customerSegmentMembers.segmentId, segment),
				eq(customerSegments.workspaceId, workspace.id)
			))
		baseConditions.push(inArray(users.id, segmentSubquery))
	}

	const where = and(...baseConditions)

	// Get customers with pagination applied AFTER segment filter
	const customerRows = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			image: users.image,
			phone: users.phone,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(where)
		.orderBy(desc(users.createdAt))
		.limit(pageSize)
		.offset(offset)

	const [total] = await db.select({ count: count() }).from(users).where(where)

	// Use customerRows directly (segment filtering now happens in SQL)
	const filteredRows = customerRows

	// Get order stats for these users (only for orders in this workspace)
	const customerIds = filteredRows.map((c) => c.id)
	let orderStats: Record<string, { orderCount: number; totalSpent: string; lastOrderAt: Date | null }> = {}

	if (customerIds.length > 0) {
		const stats = await db
			.select({
				userId: orders.userId,
				orderCount: count().as("order_count"),
				totalSpent: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`.as("total_spent"),
				lastOrderAt: sql<Date | null>`MAX(${orders.createdAt})`.as("last_order_at"),
			})
			.from(orders)
			.where(and(
				inArray(orders.userId, customerIds),
				eq(orders.workspaceId, workspace.id)
			))
			.groupBy(orders.userId)

		orderStats = Object.fromEntries(
			stats.map((s) => [s.userId, { orderCount: Number(s.orderCount), totalSpent: s.totalSpent, lastOrderAt: s.lastOrderAt }])
		)
	}

	const items = filteredRows.map((c) => ({
		...c,
		orderCount: orderStats[c.id]?.orderCount ?? 0,
		totalSpent: orderStats[c.id]?.totalSpent ?? "0",
		lastOrderAt: orderStats[c.id]?.lastOrderAt ?? null,
	}))

	return { items, totalCount: Number(total.count) }
}

export async function getCustomer(id: string) {
	const workspace = await requireWorkspace()

	// Verify customer has orders in this workspace
	const [hasOrders] = await db
		.select({ count: count() })
		.from(orders)
		.where(and(eq(orders.userId, id), eq(orders.workspaceId, workspace.id)))

	if (Number(hasOrders.count) === 0) {
		throw new Error("Customer not found")
	}

	const [customer] = await db
		.select()
		.from(users)
		.where(eq(users.id, id))
		.limit(1)

	if (!customer) throw new Error("Customer not found")

	// Get order history (only for this workspace)
	const customerOrders = await db
		.select({
			id: orders.id,
			orderNumber: orders.orderNumber,
			status: orders.status,
			total: orders.total,
			createdAt: orders.createdAt,
		})
		.from(orders)
		.where(and(eq(orders.userId, id), eq(orders.workspaceId, workspace.id)))
		.orderBy(desc(orders.createdAt))
		.limit(20)

	// Get segments (only workspace-scoped segments)
	const segments = await db
		.select({
			id: customerSegments.id,
			name: customerSegments.name,
			color: customerSegments.color,
		})
		.from(customerSegmentMembers)
		.innerJoin(customerSegments, eq(customerSegments.id, customerSegmentMembers.segmentId))
		.where(and(
			eq(customerSegmentMembers.userId, id),
			eq(customerSegments.workspaceId, workspace.id)
		))

	// Get loyalty (workspace-scoped)
	const [loyalty] = await db
		.select()
		.from(loyaltyPoints)
		.where(and(eq(loyaltyPoints.userId, id), eq(loyaltyPoints.workspaceId, workspace.id)))
		.limit(1)

	// Aggregates
	const orderCount = customerOrders.length
	const totalSpent = customerOrders.reduce((sum, o) => sum + parseFloat(o.total), 0)

	return {
		...customer,
		orders: customerOrders,
		segments,
		loyalty: loyalty ?? null,
		orderCount,
		totalSpent,
	}
}
