/**
 * Admin API - Category Detail
 *
 * GET /api/v1/categories/[id] - Get category
 * PATCH /api/v1/categories/[id] - Update category
 * DELETE /api/v1/categories/[id] - Delete category
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { categories } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readProducts")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [category] = await db
			.select()
			.from(categories)
			.where(
				and(
					eq(categories.id, id),
					eq(categories.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!category) {
			return apiError("Category not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: category })
	} catch (error) {
		console.error("Admin API - Get category error:", error)
		return apiError("Failed to get category", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify category exists and belongs to workspace
		const [existing] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, id),
					eq(categories.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Category not found", "NOT_FOUND", 404)
		}

		// Build update object
		const updates: Record<string, unknown> = {}
		if (body.name !== undefined) updates.name = body.name
		if (body.description !== undefined) updates.description = body.description
		if (body.parentId !== undefined) updates.parentId = body.parentId
		if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder
		if (body.image !== undefined) updates.image = body.image

		// Handle slug update
		if (body.slug !== undefined) {
			const [slugExists] = await db
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(
						eq(categories.workspaceId, auth.workspace.id),
						eq(categories.slug, body.slug)
					)
				)
				.limit(1)

			updates.slug = slugExists && slugExists.id !== id
				? `${body.slug}-${nanoid(6)}`
				: body.slug
		} else if (body.name !== undefined) {
			// Auto-update slug if name changed and no explicit slug provided
			const newSlug = body.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")

			const [slugExists] = await db
				.select({ id: categories.id })
				.from(categories)
				.where(
					and(
						eq(categories.workspaceId, auth.workspace.id),
						eq(categories.slug, newSlug)
					)
				)
				.limit(1)

			if (!slugExists || slugExists.id === id) {
				updates.slug = newSlug
			} else {
				updates.slug = `${newSlug}-${nanoid(6)}`
			}
		}

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		const [category] = await db
			.update(categories)
			.set(updates)
			.where(eq(categories.id, id))
			.returning()

		return apiSuccess({ data: category })
	} catch (error) {
		console.error("Admin API - Update category error:", error)
		return apiError("Failed to update category", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [existing] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, id),
					eq(categories.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Category not found", "NOT_FOUND", 404)
		}

		await db.delete(categories).where(eq(categories.id, id))

		return apiSuccess({ data: { id, deleted: true } })
	} catch (error) {
		console.error("Admin API - Delete category error:", error)
		return apiError("Failed to delete category", "INTERNAL_ERROR", 500)
	}
}
