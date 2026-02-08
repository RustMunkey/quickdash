/**
 * Admin API - Categories
 *
 * GET /api/v1/categories - List categories
 * POST /api/v1/categories - Create category
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count, sql } from "@quickdash/db/drizzle"
import { categories, products } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readProducts")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const parentId = searchParams.get("parent_id")
	const sortBy = searchParams.get("sort_by") || "sortOrder"
	const sortOrder = searchParams.get("sort_order") || "asc"

	try {
		const conditions = [eq(categories.workspaceId, auth.workspace.id)]

		if (parentId) {
			conditions.push(eq(categories.parentId, parentId))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(categories)
			.where(and(...conditions))

		// Get categories with product count
		const orderFn = sortOrder === "desc" ? desc : asc
		const sortColumn =
			sortBy === "name"
				? categories.name
				: sortBy === "createdAt"
					? categories.id
					: categories.sortOrder

		const productCountSubquery = db
			.select({
				categoryId: products.categoryId,
				productCount: count().as("product_count"),
			})
			.from(products)
			.where(eq(products.workspaceId, auth.workspace.id))
			.groupBy(products.categoryId)
			.as("product_counts")

		const categoryList = await db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
				description: categories.description,
				parentId: categories.parentId,
				sortOrder: categories.sortOrder,
				image: categories.image,
				productCount: sql<number>`COALESCE(${productCountSubquery.productCount}, 0)::int`,
			})
			.from(categories)
			.leftJoin(
				productCountSubquery,
				eq(categories.id, productCountSubquery.categoryId)
			)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: categoryList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List categories error:", error)
		return apiError("Failed to list categories", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.name || typeof body.name !== "string") {
			return apiError("Category name is required", "VALIDATION_ERROR", 400)
		}

		// Generate slug
		const slug =
			body.slug ||
			body.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "")

		// Check for duplicate slug
		const [existing] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.workspaceId, auth.workspace.id),
					eq(categories.slug, slug)
				)
			)
			.limit(1)

		const finalSlug = existing ? `${slug}-${nanoid(6)}` : slug

		const [category] = await db
			.insert(categories)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				slug: finalSlug,
				description: body.description || null,
				parentId: body.parentId || null,
				sortOrder: body.sortOrder ?? 0,
				image: body.image || null,
			})
			.returning()

		return apiSuccess({ data: category }, 201)
	} catch (error) {
		console.error("Admin API - Create category error:", error)
		return apiError("Failed to create category", "INTERNAL_ERROR", 500)
	}
}
