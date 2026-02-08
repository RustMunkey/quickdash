/**
 * Admin API - Single Media Item
 *
 * DELETE /api/v1/media/:id - Delete media record
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { mediaItems } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const [item] = await db
			.select({ id: mediaItems.id, url: mediaItems.url, filename: mediaItems.filename })
			.from(mediaItems)
			.where(
				and(
					eq(mediaItems.id, id),
					eq(mediaItems.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!item) {
			return apiError("Media item not found", "NOT_FOUND", 404)
		}

		await db.delete(mediaItems).where(eq(mediaItems.id, id))

		return apiSuccess({ message: "Media item deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete media error:", error)
		return apiError("Failed to delete media item", "INTERNAL_ERROR", 500)
	}
}
