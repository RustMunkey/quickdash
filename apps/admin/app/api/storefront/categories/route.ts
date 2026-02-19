import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, isNull, sql } from "@quickdash/db/drizzle"
import { categories, products } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)
	const includeCount = searchParams.get("count") === "true"
	const parentOnly = searchParams.get("parent_only") === "true"
	const featuredOnly = searchParams.get("featured") === "true"

	// Build conditions
	const conditions = [
		eq(categories.workspaceId, storefront.workspaceId),
	]

	if (parentOnly) {
		conditions.push(isNull(categories.parentId))
	}

	if (featuredOnly) {
		conditions.push(eq(categories.isFeatured, true))
	}

	// Get categories with optional product count
	if (includeCount) {
		const items = await db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
				description: categories.description,
				image: categories.image,
				parentId: categories.parentId,
				sortOrder: categories.sortOrder,
				isFeatured: categories.isFeatured,
				productCount: sql<number>`(
					SELECT COUNT(*) FROM products
					WHERE products.category_id = ${categories.id}
					AND products.is_active = true
				)`,
			})
			.from(categories)
			.where(and(...conditions))
			.orderBy(categories.sortOrder, categories.name)

		return Response.json({
			categories: items.map((c) => ({
				id: c.id,
				name: c.name,
				slug: c.slug,
				description: c.description,
				image: c.image,
				parentId: c.parentId,
				sortOrder: c.sortOrder,
				isFeatured: c.isFeatured,
				productCount: Number(c.productCount),
			})),
		})
	}

	const items = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
			description: categories.description,
			image: categories.image,
			parentId: categories.parentId,
			sortOrder: categories.sortOrder,
			isFeatured: categories.isFeatured,
		})
		.from(categories)
		.where(and(...conditions))
		.orderBy(categories.sortOrder, categories.name)

	return Response.json({
		categories: items,
	})
}

export const GET = withStorefrontAuth(handleGet, { requiredPermission: "products" })
export const OPTIONS = handleCorsOptions
