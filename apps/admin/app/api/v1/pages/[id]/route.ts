/**
 * Admin API - Single Page
 *
 * GET /api/v1/pages/:id - Get page
 * PATCH /api/v1/pages/:id - Update page
 * DELETE /api/v1/pages/:id - Delete page
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { sitePages } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	try {
		const [page] = await db
			.select()
			.from(sitePages)
			.where(
				and(
					eq(sitePages.id, id),
					eq(sitePages.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!page) {
			return apiError("Page not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: page })
	} catch (error) {
		console.error("Admin API - Get page error:", error)
		return apiError("Failed to get page", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: sitePages.id })
			.from(sitePages)
			.where(
				and(
					eq(sitePages.id, id),
					eq(sitePages.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Page not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		const allowedFields = [
			"title",
			"slug",
			"content",
			"status",
			"metaTitle",
			"metaDescription",
		]

		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field]
			}
		}

		// If slug is being changed, check for conflicts
		if (body.slug) {
			const [slugConflict] = await db
				.select({ id: sitePages.id })
				.from(sitePages)
				.where(
					and(
						eq(sitePages.workspaceId, auth.workspace.id),
						eq(sitePages.slug, body.slug)
					)
				)
				.limit(1)

			if (slugConflict && slugConflict.id !== id) {
				return apiError("A page with this slug already exists", "CONFLICT", 409)
			}
		}

		const [updated] = await db
			.update(sitePages)
			.set(updateData)
			.where(eq(sitePages.id, id))
			.returning()

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update page error:", error)
		return apiError("Failed to update page", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const [page] = await db
			.select({ id: sitePages.id })
			.from(sitePages)
			.where(
				and(
					eq(sitePages.id, id),
					eq(sitePages.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!page) {
			return apiError("Page not found", "NOT_FOUND", 404)
		}

		await db.delete(sitePages).where(eq(sitePages.id, id))

		return apiSuccess({ message: "Page deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete page error:", error)
		return apiError("Failed to delete page", "INTERNAL_ERROR", 500)
	}
}
