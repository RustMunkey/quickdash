import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { inventory, inventoryLogs } from "@quickdash/db/schema"
import type {
	ActionHandler,
	ProductUpdateStockConfig,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

/**
 * Update product variant stock
 */
export const handleProductUpdateStock: ActionHandler<ProductUpdateStockConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { variantId, operation, quantity } = resolved

	if (!variantId) {
		return { success: false, error: "Variant ID is required" }
	}

	if (!operation) {
		return { success: false, error: "Operation (set, increment, decrement) is required" }
	}

	const qty = typeof quantity === "string" ? parseInt(quantity, 10) : quantity
	if (isNaN(qty)) {
		return { success: false, error: "Quantity must be a valid number" }
	}

	try {
		// Get current inventory
		const [currentInventory] = await db
			.select()
			.from(inventory)
			.where(eq(inventory.variantId, variantId))
			.limit(1)

		if (!currentInventory) {
			return { success: false, error: "Inventory record not found for this variant" }
		}

		const previousQuantity = currentInventory.quantity
		let newQuantity: number

		switch (operation) {
			case "set":
				newQuantity = qty
				break
			case "increment":
				newQuantity = previousQuantity + qty
				break
			case "decrement":
				newQuantity = Math.max(0, previousQuantity - qty) // Don't go below 0
				break
			default:
				return { success: false, error: `Invalid operation: ${operation}` }
		}

		// Update inventory
		const [updated] = await db
			.update(inventory)
			.set({
				quantity: newQuantity,
				updatedAt: new Date(),
			})
			.where(eq(inventory.variantId, variantId))
			.returning()

		// Log the change
		await db.insert(inventoryLogs).values({
			variantId,
			previousQuantity,
			newQuantity,
			reason: `Workflow ${operation}: ${qty}`,
		})

		return {
			success: true,
			output: {
				variantId,
				operation,
				quantity: qty,
				previousQuantity,
				newQuantity: updated.quantity,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update stock",
		}
	}
}
