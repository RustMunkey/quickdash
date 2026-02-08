/**
 * Admin API - Discount Detail
 *
 * GET /api/v1/discounts/[id] - Get discount
 * PATCH /api/v1/discounts/[id] - Update discount
 * DELETE /api/v1/discounts/[id] - Delete discount
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { discounts } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readMarketing")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [discount] = await db
			.select()
			.from(discounts)
			.where(
				and(
					eq(discounts.id, id),
					eq(discounts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!discount) {
			return apiError("Discount not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: discount })
	} catch (error) {
		console.error("Admin API - Get discount error:", error)
		return apiError("Failed to get discount", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeMarketing")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify discount exists and belongs to workspace
		const [existing] = await db
			.select({ id: discounts.id })
			.from(discounts)
			.where(
				and(
					eq(discounts.id, id),
					eq(discounts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Discount not found", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}
		if (body.name !== undefined) updates.name = body.name
		if (body.code !== undefined) updates.code = body.code
		if (body.discountType !== undefined) updates.discountType = body.discountType
		if (body.valueType !== undefined) updates.valueType = body.valueType
		if (body.value !== undefined) updates.value = String(body.value)
		if (body.minimumOrderAmount !== undefined) updates.minimumOrderAmount = body.minimumOrderAmount ? String(body.minimumOrderAmount) : null
		if (body.maxUses !== undefined) updates.maxUses = body.maxUses
		if (body.maxUsesPerUser !== undefined) updates.maxUsesPerUser = body.maxUsesPerUser
		if (body.applicableCategories !== undefined) updates.applicableCategories = body.applicableCategories
		if (body.isActive !== undefined) updates.isActive = body.isActive
		if (body.isStackable !== undefined) updates.isStackable = body.isStackable
		if (body.startsAt !== undefined) updates.startsAt = body.startsAt ? new Date(body.startsAt) : null
		if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		// If changing code, check for duplicates
		if (updates.code) {
			const [codeExists] = await db
				.select({ id: discounts.id })
				.from(discounts)
				.where(eq(discounts.code, updates.code as string))
				.limit(1)

			if (codeExists && codeExists.id !== id) {
				return apiError("A discount with this code already exists", "CONFLICT", 409)
			}
		}

		const [discount] = await db
			.update(discounts)
			.set(updates)
			.where(eq(discounts.id, id))
			.returning()

		return apiSuccess({ data: discount })
	} catch (error) {
		console.error("Admin API - Update discount error:", error)
		return apiError("Failed to update discount", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeMarketing")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [existing] = await db
			.select({ id: discounts.id })
			.from(discounts)
			.where(
				and(
					eq(discounts.id, id),
					eq(discounts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Discount not found", "NOT_FOUND", 404)
		}

		await db.delete(discounts).where(eq(discounts.id, id))

		return apiSuccess({ data: { id, deleted: true } })
	} catch (error) {
		console.error("Admin API - Delete discount error:", error)
		return apiError("Failed to delete discount", "INTERNAL_ERROR", 500)
	}
}
