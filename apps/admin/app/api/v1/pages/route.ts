/**
 * Admin API - Site Pages
 *
 * GET /api/v1/pages - List pages
 * POST /api/v1/pages - Create page
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count } from "@quickdash/db/drizzle"
import { sitePages } from "@quickdash/db/schema"
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
		const conditions = [eq(sitePages.workspaceId, auth.workspace.id)]

		if (search) {
			conditions.push(ilike(sitePages.title, `%${search}%`))
		}
		if (status) {
			conditions.push(eq(sitePages.status, status))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(sitePages)
			.where(and(...conditions))

		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "title"
				? sitePages.title
				: sortBy === "updatedAt"
					? sitePages.updatedAt
					: sitePages.createdAt

		const pages = await db
			.select()
			.from(sitePages)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: pages,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List pages error:", error)
		return apiError("Failed to list pages", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.title || typeof body.title !== "string") {
			return apiError("Page title is required", "VALIDATION_ERROR", 400)
		}

		// Auto-generate slug from title
		const baseSlug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

		// Check for duplicate slug
		const [existing] = await db
			.select({ id: sitePages.id })
			.from(sitePages)
			.where(
				and(
					eq(sitePages.workspaceId, auth.workspace.id),
					eq(sitePages.slug, baseSlug)
				)
			)
			.limit(1)

		const finalSlug = existing ? `${baseSlug}-${nanoid(6)}` : baseSlug

		const [pageRecord] = await db
			.insert(sitePages)
			.values({
				workspaceId: auth.workspace.id,
				title: body.title,
				slug: finalSlug,
				content: body.content || null,
				status: body.status || "draft",
				metaTitle: body.metaTitle || null,
				metaDescription: body.metaDescription || null,
			})
			.returning()

		return apiSuccess({ data: pageRecord }, 201)
	} catch (error) {
		console.error("Admin API - Create page error:", error)
		return apiError("Failed to create page", "INTERNAL_ERROR", 500)
	}
}
