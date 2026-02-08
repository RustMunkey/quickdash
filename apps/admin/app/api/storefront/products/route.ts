import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, ilike, sql } from "@quickdash/db/drizzle"
import { products, categories, productVariants } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)

	// Pagination
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
	const offset = (page - 1) * limit

	// Filters
	const categorySlug = searchParams.get("category")
	const search = searchParams.get("search")
	const featured = searchParams.get("featured")
	const subscribable = searchParams.get("subscribable")

	// Sorting
	const sortBy = searchParams.get("sort") || "createdAt"
	const sortOrder = searchParams.get("order") || "desc"

	// Build conditions
	const conditions = [
		eq(products.workspaceId, storefront.workspaceId),
		eq(products.isActive, true),
	]

	if (categorySlug) {
		// Get category by slug first
		const [category] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(and(
				eq(categories.workspaceId, storefront.workspaceId),
				eq(categories.slug, categorySlug)
			))
			.limit(1)

		if (category) {
			conditions.push(eq(products.categoryId, category.id))
		}
	}

	if (search) {
		conditions.push(ilike(products.name, `%${search}%`))
	}

	if (featured === "true") {
		conditions.push(eq(products.isFeatured, true))
	}

	if (subscribable === "true") {
		conditions.push(eq(products.isSubscribable, true))
	}

	// Build sort
	const sortColumn = {
		name: products.name,
		price: products.price,
		createdAt: products.createdAt,
	}[sortBy] || products.createdAt

	const orderFn = sortOrder === "asc" ? asc : desc

	// Execute query
	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: products.id,
				name: products.name,
				slug: products.slug,
				description: products.description,
				shortDescription: products.shortDescription,
				price: products.price,
				compareAtPrice: products.compareAtPrice,
				salePrice: products.salePrice,
				saleStartsAt: products.saleStartsAt,
				saleEndsAt: products.saleEndsAt,
				images: products.images,
				thumbnail: products.thumbnail,
				isSubscribable: products.isSubscribable,
				isFeatured: products.isFeatured,
				categoryId: products.categoryId,
				categoryName: categories.name,
				categorySlug: categories.slug,
				tags: products.tags,
				createdAt: products.createdAt,
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(products)
			.where(and(...conditions)),
	])

	const totalCount = Number(countResult.count)
	const totalPages = Math.ceil(totalCount / limit)

	// Helper to check if sale is active
	const now = new Date()
	const isSaleActive = (p: typeof items[0]) => {
		if (!p.salePrice) return false
		if (p.saleStartsAt && new Date(p.saleStartsAt) > now) return false
		if (p.saleEndsAt && new Date(p.saleEndsAt) < now) return false
		return true
	}

	return Response.json({
		products: items.map((p) => ({
			id: p.id,
			name: p.name,
			slug: p.slug,
			description: p.description,
			shortDescription: p.shortDescription,
			price: p.price,
			compareAtPrice: p.compareAtPrice,
			salePrice: p.salePrice,
			saleStartsAt: p.saleStartsAt,
			saleEndsAt: p.saleEndsAt,
			currentPrice: isSaleActive(p) ? p.salePrice : p.price, // Computed active price
			onSale: isSaleActive(p),
			images: p.images,
			thumbnail: p.thumbnail,
			isSubscribable: p.isSubscribable,
			isFeatured: p.isFeatured,
			category: p.categoryId
				? { id: p.categoryId, name: p.categoryName, slug: p.categorySlug }
				: null,
			tags: p.tags,
			createdAt: p.createdAt,
		})),
		pagination: {
			page,
			limit,
			totalCount,
			totalPages,
			hasMore: page < totalPages,
		},
	})
}

export const GET = withStorefrontAuth(handleGet, { requiredPermission: "products" })
export const OPTIONS = handleCorsOptions
