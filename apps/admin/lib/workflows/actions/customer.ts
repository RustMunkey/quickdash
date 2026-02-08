import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { users, customerSegmentMembers } from "@quickdash/db/schema"
import type {
	ActionHandler,
	CustomerAddTagConfig,
	CustomerRemoveTagConfig,
	CustomerUpdateFieldConfig,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

// Allowed fields for customer updates (security measure)
const ALLOWED_UPDATE_FIELDS = [
	"name",
	"phone",
	"location",
	"bio",
	"occupation",
] as const

type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number]

/**
 * Add a customer to a segment (tag)
 */
export const handleCustomerAddTag: ActionHandler<CustomerAddTagConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { userId, segmentId } = resolved

	if (!userId) {
		return { success: false, error: "User ID is required" }
	}

	if (!segmentId) {
		return { success: false, error: "Segment ID is required" }
	}

	try {
		// Check if already a member
		const existing = await db
			.select()
			.from(customerSegmentMembers)
			.where(
				and(
					eq(customerSegmentMembers.segmentId, segmentId),
					eq(customerSegmentMembers.userId, userId)
				)
			)
			.limit(1)

		if (existing.length > 0) {
			return {
				success: true,
				output: {
					action: "already_member",
					userId,
					segmentId,
				},
			}
		}

		// Add to segment
		const [membership] = await db
			.insert(customerSegmentMembers)
			.values({
				segmentId,
				userId,
			})
			.returning()

		return {
			success: true,
			output: {
				action: "added",
				membershipId: membership.id,
				userId,
				segmentId,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to add tag",
		}
	}
}

/**
 * Remove a customer from a segment (tag)
 */
export const handleCustomerRemoveTag: ActionHandler<CustomerRemoveTagConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { userId, segmentId } = resolved

	if (!userId) {
		return { success: false, error: "User ID is required" }
	}

	if (!segmentId) {
		return { success: false, error: "Segment ID is required" }
	}

	try {
		const result = await db
			.delete(customerSegmentMembers)
			.where(
				and(
					eq(customerSegmentMembers.segmentId, segmentId),
					eq(customerSegmentMembers.userId, userId)
				)
			)
			.returning()

		return {
			success: true,
			output: {
				action: result.length > 0 ? "removed" : "not_found",
				userId,
				segmentId,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to remove tag",
		}
	}
}

/**
 * Update a customer field
 */
export const handleCustomerUpdateField: ActionHandler<CustomerUpdateFieldConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { userId, field, value } = resolved

	if (!userId) {
		return { success: false, error: "User ID is required" }
	}

	if (!field) {
		return { success: false, error: "Field name is required" }
	}

	// Security check - only allow certain fields
	if (!ALLOWED_UPDATE_FIELDS.includes(field as AllowedField)) {
		return {
			success: false,
			error: `Field "${field}" is not allowed. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(", ")}`,
		}
	}

	try {
		const [updated] = await db
			.update(users)
			.set({
				[field]: value,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))
			.returning()

		if (!updated) {
			return { success: false, error: "User not found" }
		}

		return {
			success: true,
			output: {
				userId,
				field,
				newValue: value,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to update customer",
		}
	}
}
