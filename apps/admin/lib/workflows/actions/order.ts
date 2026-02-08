import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { orders, orderNotes } from "@quickdash/db/schema"
import type {
	ActionHandler,
	OrderAddNoteConfig,
	OrderUpdateStatusConfig,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

// Valid order statuses
const VALID_STATUSES = [
	"pending",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
	"refunded",
	"on_hold",
] as const

/**
 * Add a note to an order
 */
export const handleOrderAddNote: ActionHandler<OrderAddNoteConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { orderId, content } = resolved

	if (!orderId) {
		return { success: false, error: "Order ID is required" }
	}

	if (!content) {
		return { success: false, error: "Note content is required" }
	}

	try {
		// Verify order exists
		const [order] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1)

		if (!order) {
			return { success: false, error: "Order not found" }
		}

		// Add the note
		const [note] = await db
			.insert(orderNotes)
			.values({
				orderId,
				content: `[Workflow] ${content}`,
				createdBy: null, // System-generated
			})
			.returning()

		return {
			success: true,
			output: {
				noteId: note.id,
				orderId,
				content: note.content,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to add order note",
		}
	}
}

/**
 * Update an order's status
 */
export const handleOrderUpdateStatus: ActionHandler<OrderUpdateStatusConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { orderId, status } = resolved

	if (!orderId) {
		return { success: false, error: "Order ID is required" }
	}

	if (!status) {
		return { success: false, error: "Status is required" }
	}

	// Validate status
	if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
		return {
			success: false,
			error: `Invalid status "${status}". Valid statuses: ${VALID_STATUSES.join(", ")}`,
		}
	}

	try {
		// Get current order
		const [currentOrder] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, orderId))
			.limit(1)

		if (!currentOrder) {
			return { success: false, error: "Order not found" }
		}

		const previousStatus = currentOrder.status

		// Update the status
		const [updated] = await db
			.update(orders)
			.set({
				status,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, orderId))
			.returning()

		// Add a note about the status change
		await db.insert(orderNotes).values({
			orderId,
			content: `[Workflow] Status changed from "${previousStatus}" to "${status}"`,
			createdBy: null,
		})

		return {
			success: true,
			output: {
				orderId,
				previousStatus,
				newStatus: status,
				orderNumber: updated.orderNumber,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update order status",
		}
	}
}
