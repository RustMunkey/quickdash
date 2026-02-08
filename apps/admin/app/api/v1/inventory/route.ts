/**
 * Admin API - Inventory
 *
 * GET /api/v1/inventory - List inventory with product/variant info
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, lte, desc, asc, count, sql } from "@quickdash/db/drizzle"
import { inventory, productVariants, products } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readInventory")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const filter = searchParams.get("filter") // low_stock, out_of_stock
	const sortBy = searchParams.get("sort_by") || "updatedAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(inventory.workspaceId, auth.workspace.id)]

		if (filter === "low_stock") {
			conditions.push(
				sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`
			)
		}
		if (filter === "out_of_stock") {
			conditions.push(eq(inventory.quantity, 0))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(inventory)
			.where(and(...conditions))

		// Get inventory with product/variant details
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "quantity"
				? inventory.quantity
				: sortBy === "productName"
					? products.name
					: inventory.updatedAt

		const inventoryList = await db
			.select({
				id: inventory.id,
				variantId: inventory.variantId,
				quantity: inventory.quantity,
				reservedQuantity: inventory.reservedQuantity,
				lowStockThreshold: inventory.lowStockThreshold,
				availableQuantity: sql<number>`(${inventory.quantity} - ${inventory.reservedQuantity})::int`,
				updatedAt: inventory.updatedAt,
				variantName: productVariants.name,
				variantSku: productVariants.sku,
				productId: products.id,
				productName: products.name,
			})
			.from(inventory)
			.innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
			.innerJoin(products, eq(productVariants.productId, products.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: inventoryList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List inventory error:", error)
		return apiError("Failed to list inventory", "INTERNAL_ERROR", 500)
	}
}
