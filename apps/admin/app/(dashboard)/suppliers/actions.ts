"use server"

import { eq, desc, count, and, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import {
	suppliers,
	purchaseOrders,
	purchaseOrderItems,
	productVariants,
	products,
} from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireSuppliersPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage suppliers")
	}
	return workspace
}

// --- SUPPLIERS ---

interface GetSuppliersParams {
	page?: number
	pageSize?: number
}

export async function getSuppliers(params: GetSuppliersParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(suppliers.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(suppliers)
			.where(where)
			.orderBy(desc(suppliers.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(suppliers).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getSupplier(id: string) {
	const workspace = await requireWorkspace()
	const [supplier] = await db
		.select()
		.from(suppliers)
		.where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspace.id)))
		.limit(1)

	return supplier ?? null
}

export async function createSupplier(data: {
	name: string
	contactEmail?: string
	contactPhone?: string
	website?: string
	country?: string
	averageLeadTimeDays?: string
	notes?: string
}) {
	const workspace = await requireSuppliersPermission()

	const [supplier] = await db.insert(suppliers).values({ ...data, workspaceId: workspace.id }).returning()

	await logAudit({
		action: "supplier.created",
		targetType: "supplier",
		targetId: supplier.id,
		metadata: { name: data.name },
	})

	return supplier
}

export async function updateSupplier(id: string, data: {
	name?: string
	contactEmail?: string
	contactPhone?: string
	website?: string
	country?: string
	averageLeadTimeDays?: string
	notes?: string
}) {
	const workspace = await requireSuppliersPermission()

	await db
		.update(suppliers)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspace.id)))

	await logAudit({
		action: "supplier.updated",
		targetType: "supplier",
		targetId: id,
	})
}

export async function deleteSupplier(id: string) {
	const workspace = await requireSuppliersPermission()

	await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, workspace.id)))

	await logAudit({
		action: "supplier.deleted",
		targetType: "supplier",
		targetId: id,
	})
}

export async function bulkDeleteSuppliers(ids: string[]) {
	const workspace = await requireSuppliersPermission()
	await db.delete(suppliers).where(and(inArray(suppliers.id, ids), eq(suppliers.workspaceId, workspace.id)))
}

// --- PURCHASE ORDERS ---

interface GetPurchaseOrdersParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getPurchaseOrders(params: GetPurchaseOrdersParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Filter by workspace through suppliers
	const conditions = [eq(suppliers.workspaceId, workspace.id)]
	if (status) {
		conditions.push(eq(purchaseOrders.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: purchaseOrders.id,
				poNumber: purchaseOrders.poNumber,
				supplierId: purchaseOrders.supplierId,
				status: purchaseOrders.status,
				total: purchaseOrders.total,
				expectedDelivery: purchaseOrders.expectedDelivery,
				receivedAt: purchaseOrders.receivedAt,
				createdAt: purchaseOrders.createdAt,
				supplierName: suppliers.name,
			})
			.from(purchaseOrders)
			.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.where(where)
			.orderBy(desc(purchaseOrders.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(purchaseOrders)
			.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.where(where),
	])

	return { items, totalCount: total.count }
}

export async function getPurchaseOrder(id: string) {
	const workspace = await requireWorkspace()

	const [po] = await db
		.select({
			id: purchaseOrders.id,
			poNumber: purchaseOrders.poNumber,
			supplierId: purchaseOrders.supplierId,
			status: purchaseOrders.status,
			subtotal: purchaseOrders.subtotal,
			shippingCost: purchaseOrders.shippingCost,
			total: purchaseOrders.total,
			expectedDelivery: purchaseOrders.expectedDelivery,
			receivedAt: purchaseOrders.receivedAt,
			notes: purchaseOrders.notes,
			createdAt: purchaseOrders.createdAt,
			updatedAt: purchaseOrders.updatedAt,
			supplierName: suppliers.name,
		})
		.from(purchaseOrders)
		.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(and(eq(purchaseOrders.id, id), eq(suppliers.workspaceId, workspace.id)))
		.limit(1)

	if (!po) return null

	const items = await db
		.select({
			id: purchaseOrderItems.id,
			variantId: purchaseOrderItems.variantId,
			quantity: purchaseOrderItems.quantity,
			unitCost: purchaseOrderItems.unitCost,
			totalCost: purchaseOrderItems.totalCost,
			receivedQuantity: purchaseOrderItems.receivedQuantity,
			variantName: productVariants.name,
			variantSku: productVariants.sku,
			productName: products.name,
		})
		.from(purchaseOrderItems)
		.innerJoin(productVariants, eq(purchaseOrderItems.variantId, productVariants.id))
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(eq(purchaseOrderItems.purchaseOrderId, id))

	return { ...po, items }
}

export async function createPurchaseOrder(data: {
	supplierId: string
	notes?: string
	expectedDelivery?: Date
}) {
	const workspace = await requireSuppliersPermission()

	// Verify supplier belongs to this workspace
	const [supplier] = await db
		.select({ id: suppliers.id })
		.from(suppliers)
		.where(and(eq(suppliers.id, data.supplierId), eq(suppliers.workspaceId, workspace.id)))
		.limit(1)

	if (!supplier) throw new Error("Supplier not found")

	const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`

	const [po] = await db
		.insert(purchaseOrders)
		.values({
			poNumber,
			supplierId: data.supplierId,
			notes: data.notes,
			expectedDelivery: data.expectedDelivery,
		})
		.returning()

	await logAudit({
		action: "purchase_order.created",
		targetType: "purchase_order",
		targetId: po.id,
		metadata: { poNumber },
	})

	return po
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
	const workspace = await requireSuppliersPermission()

	// Verify PO's supplier belongs to this workspace
	const [po] = await db
		.select({ id: purchaseOrders.id })
		.from(purchaseOrders)
		.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(and(eq(purchaseOrders.id, id), eq(suppliers.workspaceId, workspace.id)))
		.limit(1)

	if (!po) throw new Error("Purchase order not found")

	const updates: Record<string, unknown> = {
		status,
		updatedAt: new Date(),
	}

	if (status === "received") {
		updates.receivedAt = new Date()
	}

	await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id))

	await logAudit({
		action: `purchase_order.${status}`,
		targetType: "purchase_order",
		targetId: id,
	})
}

export async function deletePurchaseOrder(id: string) {
	const workspace = await requireSuppliersPermission()

	// Verify PO's supplier belongs to this workspace
	const [po] = await db
		.select({ id: purchaseOrders.id })
		.from(purchaseOrders)
		.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(and(eq(purchaseOrders.id, id), eq(suppliers.workspaceId, workspace.id)))
		.limit(1)

	if (!po) throw new Error("Purchase order not found")

	await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id))

	await logAudit({
		action: "purchase_order.deleted",
		targetType: "purchase_order",
		targetId: id,
	})
}

export async function bulkDeletePurchaseOrders(ids: string[]) {
	const workspace = await requireSuppliersPermission()
	// Only delete POs whose supplier belongs to this workspace
	const workspacePOs = await db
		.select({ id: purchaseOrders.id })
		.from(purchaseOrders)
		.innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(and(inArray(purchaseOrders.id, ids), eq(suppliers.workspaceId, workspace.id)))
	const validIds = workspacePOs.map((po) => po.id)
	if (validIds.length > 0) {
		await db.delete(purchaseOrders).where(inArray(purchaseOrders.id, validIds))
	}
}
