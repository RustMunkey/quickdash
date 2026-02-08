/**
 * Admin API - Products
 *
 * GET /api/v1/products - List products
 * POST /api/v1/products - Create product
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count } from "@quickdash/db/drizzle"
import { products, categories } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

export async function GET(request: NextRequest) {
	// Authenticate
	const auth = await authenticateAdminApi("readProducts")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	// Filters
	const search = searchParams.get("search")
	const categoryId = searchParams.get("category_id")
	const active = searchParams.get("active")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		// Build conditions
		const conditions = [eq(products.workspaceId, auth.workspace.id)]

		if (search) {
			conditions.push(ilike(products.name, `%${search}%`))
		}
		if (categoryId) {
			conditions.push(eq(products.categoryId, categoryId))
		}
		if (active !== null) {
			conditions.push(eq(products.isActive, active === "true"))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(products)
			.where(and(...conditions))

		// Get products with category
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn = sortBy === "name" ? products.name :
			sortBy === "price" ? products.price :
			sortBy === "updatedAt" ? products.updatedAt :
			products.createdAt

		const productList = await db
			.select({
				id: products.id,
				name: products.name,
				slug: products.slug,
				description: products.description,
				shortDescription: products.shortDescription,
				price: products.price,
				compareAtPrice: products.compareAtPrice,
				costPrice: products.costPrice,
				isActive: products.isActive,
				isFeatured: products.isFeatured,
				isSubscribable: products.isSubscribable,
				images: products.images,
				thumbnail: products.thumbnail,
				categoryId: products.categoryId,
				categoryName: categories.name,
				tags: products.tags,
				weight: products.weight,
				weightUnit: products.weightUnit,
				metaTitle: products.metaTitle,
				metaDescription: products.metaDescription,
				createdAt: products.createdAt,
				updatedAt: products.updatedAt,
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: productList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List products error:", error)
		return apiError("Failed to list products", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	// Authenticate
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		// Validate required fields
		if (!body.name || typeof body.name !== "string") {
			return apiError("Product name is required", "VALIDATION_ERROR", 400)
		}

		// Generate slug if not provided
		const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

		// Check for duplicate slug
		const [existing] = await db
			.select({ id: products.id })
			.from(products)
			.where(and(eq(products.workspaceId, auth.workspace.id), eq(products.slug, slug)))
			.limit(1)

		const finalSlug = existing ? `${slug}-${nanoid(6)}` : slug

		// Create product
		const [product] = await db
			.insert(products)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				slug: finalSlug,
				description: body.description || null,
				shortDescription: body.shortDescription || null,
				price: body.price ? String(body.price) : "0",
				compareAtPrice: body.compareAtPrice ? String(body.compareAtPrice) : null,
				costPrice: body.costPrice ? String(body.costPrice) : null,
				isActive: body.isActive !== false,
				isFeatured: body.isFeatured || false,
				isSubscribable: body.isSubscribable || false,
				images: body.images || [],
				thumbnail: body.thumbnail || null,
				categoryId: body.categoryId || null,
				tags: body.tags || [],
				weight: body.weight ? String(body.weight) : null,
				weightUnit: body.weightUnit || "oz",
				metaTitle: body.metaTitle || null,
				metaDescription: body.metaDescription || null,
			})
			.returning()

		return apiSuccess({ data: product }, 201)
	} catch (error) {
		console.error("Admin API - Create product error:", error)
		return apiError("Failed to create product", "INTERNAL_ERROR", 500)
	}
}
