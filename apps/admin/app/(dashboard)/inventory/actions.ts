"use server"

import { eq, and, desc, sql, count, lte, ilike, or, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { inventory, inventoryLogs, products, productVariants } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { fireWebhooks } from "@/lib/webhooks/outgoing"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireInventoryPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage inventory")
	}
	return workspace
}

interface GetInventoryParams {
	page?: number
	pageSize?: number
	search?: string
	filter?: string // all | low | out
}

export async function getInventory(params: GetInventoryParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search, filter } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace through products
	const conditions = [eq(products.workspaceId, workspace.id)]
	if (search) {
		conditions.push(
			or(
				ilike(products.name, `%${search}%`),
				ilike(productVariants.sku, `%${search}%`),
				ilike(productVariants.name, `%${search}%`)
			)!
		)
	}
	if (filter === "low") {
		conditions.push(
			and(
				sql`${inventory.quantity} - ${inventory.reservedQuantity} <= ${inventory.lowStockThreshold}`,
				sql`${inventory.quantity} - ${inventory.reservedQuantity} > 0`
			)!
		)
	} else if (filter === "out") {
		conditions.push(lte(sql`${inventory.quantity} - ${inventory.reservedQuantity}`, 0))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: inventory.id,
				variantId: inventory.variantId,
				quantity: inventory.quantity,
				reservedQuantity: inventory.reservedQuantity,
				lowStockThreshold: inventory.lowStockThreshold,
				updatedAt: inventory.updatedAt,
				variantName: productVariants.name,
				variantSku: productVariants.sku,
				productName: products.name,
				productId: products.id,
			})
			.from(inventory)
			.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(where)
			.orderBy(desc(inventory.updatedAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(inventory)
			.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(where),
	])

	return { items, totalCount: total.count }
}

export async function getAlerts(params: { page?: number; pageSize?: number } = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const whereCondition = and(
		eq(products.workspaceId, workspace.id),
		sql`${inventory.quantity} - ${inventory.reservedQuantity} <= ${inventory.lowStockThreshold}`
	)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: inventory.id,
				variantId: inventory.variantId,
				quantity: inventory.quantity,
				reservedQuantity: inventory.reservedQuantity,
				lowStockThreshold: inventory.lowStockThreshold,
				updatedAt: inventory.updatedAt,
				variantName: productVariants.name,
				variantSku: productVariants.sku,
				productName: products.name,
				productId: products.id,
			})
			.from(inventory)
			.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(whereCondition)
			.orderBy(sql`${inventory.quantity} - ${inventory.reservedQuantity} ASC`)
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(inventory)
			.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(whereCondition),
	])

	return { items, totalCount: total.count }
}

export async function getInventoryLogs(params: { page?: number; pageSize?: number } = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const whereCondition = eq(products.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: inventoryLogs.id,
				variantId: inventoryLogs.variantId,
				previousQuantity: inventoryLogs.previousQuantity,
				newQuantity: inventoryLogs.newQuantity,
				reason: inventoryLogs.reason,
				orderId: inventoryLogs.orderId,
				createdAt: inventoryLogs.createdAt,
				variantName: productVariants.name,
				variantSku: productVariants.sku,
				productName: products.name,
			})
			.from(inventoryLogs)
			.innerJoin(productVariants, eq(inventoryLogs.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(whereCondition)
			.orderBy(desc(inventoryLogs.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(inventoryLogs)
			.innerJoin(productVariants, eq(inventoryLogs.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(whereCondition),
	])

	return { items, totalCount: total.count }
}

export async function adjustStock(
	inventoryId: string,
	newQuantity: number,
	reason: string
) {
	const workspace = await requireInventoryPermission()

	const [itemWithDetails] = await db
		.select({
			id: inventory.id,
			variantId: inventory.variantId,
			quantity: inventory.quantity,
			reservedQuantity: inventory.reservedQuantity,
			lowStockThreshold: inventory.lowStockThreshold,
			variantSku: productVariants.sku,
			variantName: productVariants.name,
			productName: products.name,
			productId: products.id,
		})
		.from(inventory)
		.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(and(eq(inventory.id, inventoryId), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!itemWithDetails) throw new Error("Inventory record not found")

	const previousAvailable = itemWithDetails.quantity - itemWithDetails.reservedQuantity
	const newAvailable = newQuantity - itemWithDetails.reservedQuantity
	const threshold = itemWithDetails.lowStockThreshold ?? 0

	await db.insert(inventoryLogs).values({
		variantId: itemWithDetails.variantId,
		previousQuantity: itemWithDetails.quantity,
		newQuantity,
		reason,
	})

	await db
		.update(inventory)
		.set({ quantity: newQuantity, updatedAt: new Date() })
		.where(eq(inventory.id, inventoryId))

	await logAudit({
		action: "inventory.adjusted",
		targetType: "inventory",
		targetId: inventoryId,
		metadata: { previous: itemWithDetails.quantity, new: newQuantity, reason },
	})

	// Broadcast real-time inventory updates - consolidated into single event
	// Optimized: Single Pusher call instead of 2 separate calls
	if (pusherServer) {
		// Determine state transition if any
		let stateChange: "out_of_stock" | "low_stock" | "restocked" | null = null
		if (newAvailable <= 0 && previousAvailable > 0) {
			stateChange = "out_of_stock"
		} else if (newAvailable <= threshold && previousAvailable > threshold) {
			stateChange = "low_stock"
		} else if (newAvailable > threshold && previousAvailable <= threshold) {
			stateChange = "restocked"
		}

		// Single consolidated event with all data
		await pusherServer.trigger(wsChannel(workspace.id, "inventory"), "inventory:updated", {
			id: inventoryId,
			variantId: itemWithDetails.variantId,
			quantity: newQuantity,
			reservedQuantity: itemWithDetails.reservedQuantity,
			lowStockThreshold: itemWithDetails.lowStockThreshold,
			updatedAt: new Date().toISOString(),
			variantName: itemWithDetails.variantName,
			variantSku: itemWithDetails.variantSku,
			productName: itemWithDetails.productName,
			productId: itemWithDetails.productId,
			// State transition info included in same event
			availableStock: newAvailable,
			previousAvailable,
			stateChange,
		})
	}

	// Fire outgoing webhooks for inventory alerts
	const webhookData = {
		inventoryId,
		variantId: itemWithDetails.variantId,
		productId: itemWithDetails.productId,
		productName: itemWithDetails.productName,
		variantName: itemWithDetails.variantName,
		sku: itemWithDetails.variantSku,
		previousQuantity: itemWithDetails.quantity,
		newQuantity,
		availableStock: newAvailable,
		threshold,
		reason,
	}

	if (newAvailable <= 0 && previousAvailable > 0) {
		await fireWebhooks("inventory.out_of_stock", webhookData, workspace.id)
	} else if (newAvailable <= threshold && previousAvailable > threshold) {
		await fireWebhooks("inventory.low_stock", webhookData, workspace.id)
	} else if (newAvailable > threshold && previousAvailable <= threshold) {
		await fireWebhooks("inventory.restocked", webhookData, workspace.id)
	}
}

export async function bulkDeleteInventory(ids: string[]) {
	const workspace = await requireInventoryPermission()
	// Get the variant IDs through product workspace verification
	const items = await db
		.select({ id: inventory.id })
		.from(inventory)
		.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(and(inArray(inventory.id, ids), eq(products.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(inventory).where(inArray(inventory.id, validIds))
	}
}

export async function bulkDeleteAlerts(ids: string[]) {
	const workspace = await requireInventoryPermission()
	const items = await db
		.select({ id: inventory.id })
		.from(inventory)
		.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(and(inArray(inventory.id, ids), eq(products.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(inventory).where(inArray(inventory.id, validIds))
	}
}

export async function bulkDeleteInventoryLogs(ids: string[]) {
	const workspace = await requireInventoryPermission()
	const items = await db
		.select({ id: inventoryLogs.id })
		.from(inventoryLogs)
		.innerJoin(productVariants, eq(inventoryLogs.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(and(inArray(inventoryLogs.id, ids), eq(products.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(inventoryLogs).where(inArray(inventoryLogs.id, validIds))
	}
}

export async function updateThreshold(inventoryId: string, threshold: number) {
	const workspace = await requireInventoryPermission()

	// Verify inventory belongs to a product in this workspace
	const [item] = await db
		.select({ id: inventory.id })
		.from(inventory)
		.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(and(eq(inventory.id, inventoryId), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!item) throw new Error("Inventory record not found")

	await db
		.update(inventory)
		.set({ lowStockThreshold: threshold, updatedAt: new Date() })
		.where(eq(inventory.id, inventoryId))

	await logAudit({
		action: "inventory.threshold_updated",
		targetType: "inventory",
		targetId: inventoryId,
		metadata: { threshold },
	})
}
