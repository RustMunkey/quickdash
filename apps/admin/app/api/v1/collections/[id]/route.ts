/**
 * Admin API - Single Collection
 *
 * GET /api/v1/collections/:id - Get collection
 * PATCH /api/v1/collections/:id - Update collection
 * DELETE /api/v1/collections/:id - Delete collection
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql, count } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	try {
		const [collection] = await db
			.select({
				id: contentCollections.id,
				name: contentCollections.name,
				slug: contentCollections.slug,
				description: contentCollections.description,
				icon: contentCollections.icon,
				schema: contentCollections.schema,
				allowPublicSubmit: contentCollections.allowPublicSubmit,
				publicSubmitStatus: contentCollections.publicSubmitStatus,
				isActive: contentCollections.isActive,
				sortOrder: contentCollections.sortOrder,
				createdAt: contentCollections.createdAt,
				updatedAt: contentCollections.updatedAt,
				entryCount: sql<number>`COUNT(${contentEntries.id})::int`.as("entry_count"),
			})
			.from(contentCollections)
			.leftJoin(contentEntries, eq(contentCollections.id, contentEntries.collectionId))
			.where(
				and(
					eq(contentCollections.id, id),
					eq(contentCollections.workspaceId, auth.workspace.id)
				)
			)
			.groupBy(contentCollections.id)
			.limit(1)

		if (!collection) {
			return apiError("Collection not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: collection })
	} catch (error) {
		console.error("Admin API - Get collection error:", error)
		return apiError("Failed to get collection", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: contentCollections.id })
			.from(contentCollections)
			.where(
				and(
					eq(contentCollections.id, id),
					eq(contentCollections.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Collection not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		// If slug is being changed, check for conflicts
		if (body.slug) {
			const [slugConflict] = await db
				.select({ id: contentCollections.id })
				.from(contentCollections)
				.where(
					and(
						eq(contentCollections.workspaceId, auth.workspace.id),
						eq(contentCollections.slug, body.slug)
					)
				)
				.limit(1)

			if (slugConflict && slugConflict.id !== id) {
				return apiError("A collection with this slug already exists", "CONFLICT", 409)
			}
		}

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		const allowedFields = [
			"name",
			"slug",
			"description",
			"icon",
			"schema",
			"allowPublicSubmit",
			"publicSubmitStatus",
			"isActive",
			"sortOrder",
		]

		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field]
			}
		}

		const [updated] = await db
			.update(contentCollections)
			.set(updateData)
			.where(eq(contentCollections.id, id))
			.returning()

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update collection error:", error)
		return apiError("Failed to update collection", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const [collection] = await db
			.select({ id: contentCollections.id, name: contentCollections.name })
			.from(contentCollections)
			.where(
				and(
					eq(contentCollections.id, id),
					eq(contentCollections.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!collection) {
			return apiError("Collection not found", "NOT_FOUND", 404)
		}

		// Delete collection (cascade will handle entries)
		await db.delete(contentCollections).where(eq(contentCollections.id, id))

		return apiSuccess({ message: "Collection deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete collection error:", error)
		return apiError("Failed to delete collection", "INTERNAL_ERROR", 500)
	}
}
