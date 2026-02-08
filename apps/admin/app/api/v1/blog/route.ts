/**
 * Admin API - Blog Posts
 *
 * GET /api/v1/blog - List blog posts
 * POST /api/v1/blog - Create blog post
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count } from "@quickdash/db/drizzle"
import { blogPosts } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const search = searchParams.get("search")
	const status = searchParams.get("status")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(blogPosts.workspaceId, auth.workspace.id)]

		if (search) {
			conditions.push(ilike(blogPosts.title, `%${search}%`))
		}
		if (status) {
			conditions.push(eq(blogPosts.status, status))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(blogPosts)
			.where(and(...conditions))

		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "title"
				? blogPosts.title
				: sortBy === "publishedAt"
					? blogPosts.publishedAt
					: sortBy === "updatedAt"
						? blogPosts.updatedAt
						: blogPosts.createdAt

		const posts = await db
			.select()
			.from(blogPosts)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: posts,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List blog posts error:", error)
		return apiError("Failed to list blog posts", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.title || typeof body.title !== "string") {
			return apiError("Blog post title is required", "VALIDATION_ERROR", 400)
		}

		// Auto-generate slug from title
		const baseSlug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

		// Check for duplicate slug
		const [existing] = await db
			.select({ id: blogPosts.id })
			.from(blogPosts)
			.where(
				and(
					eq(blogPosts.workspaceId, auth.workspace.id),
					eq(blogPosts.slug, baseSlug)
				)
			)
			.limit(1)

		const finalSlug = existing ? `${baseSlug}-${nanoid(6)}` : baseSlug

		// If status is "published", set publishedAt to now
		const publishedAt =
			body.status === "published" ? body.publishedAt || new Date() : body.publishedAt || null

		const [post] = await db
			.insert(blogPosts)
			.values({
				workspaceId: auth.workspace.id,
				title: body.title,
				slug: finalSlug,
				excerpt: body.excerpt || null,
				content: body.content || null,
				coverImage: body.coverImage || null,
				author: body.author || null,
				status: body.status || "draft",
				publishedAt,
				metaTitle: body.metaTitle || null,
				metaDescription: body.metaDescription || null,
				tags: body.tags || [],
			})
			.returning()

		return apiSuccess({ data: post }, 201)
	} catch (error) {
		console.error("Admin API - Create blog post error:", error)
		return apiError("Failed to create blog post", "INTERNAL_ERROR", 500)
	}
}
