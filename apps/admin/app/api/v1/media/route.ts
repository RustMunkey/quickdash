/**
 * Admin API - Media Items
 *
 * GET /api/v1/media - List media items
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count } from "@quickdash/db/drizzle"
import { mediaItems } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const search = searchParams.get("search")
	const mimeType = searchParams.get("mime_type")
	const folder = searchParams.get("folder")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(mediaItems.workspaceId, auth.workspace.id)]

		if (search) {
			conditions.push(ilike(mediaItems.filename, `%${search}%`))
		}
		if (mimeType) {
			conditions.push(ilike(mediaItems.mimeType, `%${mimeType}%`))
		}
		if (folder) {
			conditions.push(eq(mediaItems.folder, folder))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(mediaItems)
			.where(and(...conditions))

		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "filename"
				? mediaItems.filename
				: sortBy === "size"
					? mediaItems.size
					: mediaItems.createdAt

		const items = await db
			.select()
			.from(mediaItems)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: items,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List media error:", error)
		return apiError("Failed to list media", "INTERNAL_ERROR", 500)
	}
}
