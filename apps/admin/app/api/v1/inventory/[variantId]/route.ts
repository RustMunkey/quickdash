/**
 * Admin API - Inventory Detail
 *
 * PATCH /api/v1/inventory/[variantId] - Update inventory quantity
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { inventory, inventoryLogs } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ variantId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeInventory")
	if (!auth.success) return auth.response

	const { variantId } = await params

	try {
		const body = await request.json()

		if (body.quantity === undefined || typeof body.quantity !== "number") {
			return apiError("Quantity is required and must be a number", "VALIDATION_ERROR", 400)
		}
		if (!body.reason || typeof body.reason !== "string") {
			return apiError("Reason is required", "VALIDATION_ERROR", 400)
		}
		if (body.quantity < 0) {
			return apiError("Quantity cannot be negative", "VALIDATION_ERROR", 400)
		}

		// Find existing inventory record
		const [existing] = await db
			.select()
			.from(inventory)
			.where(
				and(
					eq(inventory.variantId, variantId),
					eq(inventory.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Inventory record not found for this variant", "NOT_FOUND", 404)
		}

		const previousQuantity = existing.quantity
		const newQuantity = body.quantity

		// Update inventory
		const [updated] = await db
			.update(inventory)
			.set({
				quantity: newQuantity,
				updatedAt: new Date(),
			})
			.where(eq(inventory.id, existing.id))
			.returning()

		// Insert inventory log
		await db.insert(inventoryLogs).values({
			workspaceId: auth.workspace.id,
			variantId,
			previousQuantity,
			newQuantity,
			reason: body.reason,
			orderId: body.orderId || null,
		})

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update inventory error:", error)
		return apiError("Failed to update inventory", "INTERNAL_ERROR", 500)
	}
}
