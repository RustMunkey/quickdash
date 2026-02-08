/**
 * Admin API - Single Blog Post
 *
 * GET /api/v1/blog/:id - Get blog post
 * PATCH /api/v1/blog/:id - Update blog post
 * DELETE /api/v1/blog/:id - Delete blog post
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { blogPosts } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	try {
		const [post] = await db
			.select()
			.from(blogPosts)
			.where(
				and(
					eq(blogPosts.id, id),
					eq(blogPosts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!post) {
			return apiError("Blog post not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: post })
	} catch (error) {
		console.error("Admin API - Get blog post error:", error)
		return apiError("Failed to get blog post", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: blogPosts.id, status: blogPosts.status, publishedAt: blogPosts.publishedAt })
			.from(blogPosts)
			.where(
				and(
					eq(blogPosts.id, id),
					eq(blogPosts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Blog post not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		const allowedFields = [
			"title",
			"slug",
			"excerpt",
			"content",
			"coverImage",
			"author",
			"status",
			"publishedAt",
			"metaTitle",
			"metaDescription",
			"tags",
		]

		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field]
			}
		}

		// If status is changing to "published" and publishedAt was not already set, set it now
		if (
			body.status === "published" &&
			existing.status !== "published" &&
			!existing.publishedAt &&
			body.publishedAt === undefined
		) {
			updateData.publishedAt = new Date()
		}

		const [updated] = await db
			.update(blogPosts)
			.set(updateData)
			.where(eq(blogPosts.id, id))
			.returning()

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update blog post error:", error)
		return apiError("Failed to update blog post", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const [post] = await db
			.select({ id: blogPosts.id })
			.from(blogPosts)
			.where(
				and(
					eq(blogPosts.id, id),
					eq(blogPosts.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!post) {
			return apiError("Blog post not found", "NOT_FOUND", 404)
		}

		await db.delete(blogPosts).where(eq(blogPosts.id, id))

		return apiSuccess({ message: "Blog post deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete blog post error:", error)
		return apiError("Failed to delete blog post", "INTERNAL_ERROR", 500)
	}
}
