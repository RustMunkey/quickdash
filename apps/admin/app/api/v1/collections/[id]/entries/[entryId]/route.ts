/**
 * Admin API - Single Collection Entry
 *
 * GET /api/v1/collections/:id/entries/:entryId - Get entry
 * PATCH /api/v1/collections/:id/entries/:entryId - Update entry
 * DELETE /api/v1/collections/:id/entries/:entryId - Delete entry
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string; entryId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id, entryId } = await params

	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	try {
		// Verify collection belongs to workspace
		const [collection] = await db
			.select({ id: contentCollections.id })
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

		const [entry] = await db
			.select()
			.from(contentEntries)
			.where(
				and(
					eq(contentEntries.id, entryId),
					eq(contentEntries.collectionId, id),
					eq(contentEntries.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!entry) {
			return apiError("Entry not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: entry })
	} catch (error) {
		console.error("Admin API - Get entry error:", error)
		return apiError("Failed to get entry", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id, entryId } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify collection belongs to workspace
		const [collection] = await db
			.select({ id: contentCollections.id })
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

		// Verify entry exists and belongs to collection + workspace
		const [existing] = await db
			.select({ id: contentEntries.id })
			.from(contentEntries)
			.where(
				and(
					eq(contentEntries.id, entryId),
					eq(contentEntries.collectionId, id),
					eq(contentEntries.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Entry not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (body.data !== undefined) {
			if (typeof body.data !== "object") {
				return apiError("Entry data must be an object", "VALIDATION_ERROR", 400)
			}
			updateData.data = body.data
		}
		if (body.isActive !== undefined) {
			updateData.isActive = body.isActive
		}
		if (body.sortOrder !== undefined) {
			updateData.sortOrder = body.sortOrder
		}
		if (body.updatedBy !== undefined) {
			updateData.updatedBy = body.updatedBy
		}

		const [updated] = await db
			.update(contentEntries)
			.set(updateData)
			.where(eq(contentEntries.id, entryId))
			.returning()

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update entry error:", error)
		return apiError("Failed to update entry", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id, entryId } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify collection belongs to workspace
		const [collection] = await db
			.select({ id: contentCollections.id })
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

		const [entry] = await db
			.select({ id: contentEntries.id })
			.from(contentEntries)
			.where(
				and(
					eq(contentEntries.id, entryId),
					eq(contentEntries.collectionId, id),
					eq(contentEntries.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!entry) {
			return apiError("Entry not found", "NOT_FOUND", 404)
		}

		await db.delete(contentEntries).where(eq(contentEntries.id, entryId))

		return apiSuccess({ message: "Entry deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete entry error:", error)
		return apiError("Failed to delete entry", "INTERNAL_ERROR", 500)
	}
}
