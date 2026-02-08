/**
 * Admin API - Single Site Content Entry
 *
 * DELETE /api/v1/site-content/:key - Delete a KV pair by key
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { siteContent } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ key: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { key } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const [existing] = await db
			.select({ id: siteContent.id })
			.from(siteContent)
			.where(
				and(
					eq(siteContent.workspaceId, auth.workspace.id),
					eq(siteContent.key, decodeURIComponent(key))
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Site content entry not found", "NOT_FOUND", 404)
		}

		await db.delete(siteContent).where(eq(siteContent.id, existing.id))

		return apiSuccess({ message: "Site content entry deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete site content error:", error)
		return apiError("Failed to delete site content", "INTERNAL_ERROR", 500)
	}
}
