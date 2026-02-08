import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, asc, desc, sql } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, storefrontError, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/collections/:slug - Get collection entries
 *
 * Query params:
 *   ?filter[status]=approved    - Filter by data field value
 *   ?filter[isFeatured]=true    - Multiple filters supported
 *   ?sort=createdAt&order=desc  - Sort by field (createdAt, sortOrder, or data field key)
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)
	const slug = request.nextUrl.pathname.split("/").pop()!

	// Find the collection
	const [collection] = await db
		.select()
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.workspaceId, storefront.workspaceId),
				eq(contentCollections.slug, slug),
				eq(contentCollections.isActive, true)
			)
		)
		.limit(1)

	if (!collection) {
		return storefrontError("Collection not found", 404)
	}

	// Build conditions
	const conditions = [
		eq(contentEntries.collectionId, collection.id),
		eq(contentEntries.isActive, true),
	]

	// Apply data field filters: ?filter[key]=value
	for (const [param, value] of searchParams.entries()) {
		const match = param.match(/^filter\[(.+)\]$/)
		if (match) {
			const fieldKey = match[1]
			conditions.push(sql`${contentEntries.data}->>${sql.raw(`'${fieldKey.replace(/'/g, "''")}'`)} = ${value}`)
		}
	}

	// Sort
	const sortField = searchParams.get("sort")
	const sortOrder = searchParams.get("order") === "desc" ? "desc" : "asc"

	let orderBy
	if (sortField === "createdAt") {
		orderBy = sortOrder === "desc" ? desc(contentEntries.createdAt) : asc(contentEntries.createdAt)
	} else if (sortField === "sortOrder" || !sortField) {
		orderBy = asc(contentEntries.sortOrder)
	} else {
		// Sort by data field
		orderBy = sortOrder === "desc"
			? desc(sql`${contentEntries.data}->>${sql.raw(`'${sortField.replace(/'/g, "''")}'`)}`)
			: asc(sql`${contentEntries.data}->>${sql.raw(`'${sortField.replace(/'/g, "''")}'`)}`)
	}

	const entries = await db
		.select({
			id: contentEntries.id,
			data: contentEntries.data,
			sortOrder: contentEntries.sortOrder,
			createdAt: contentEntries.createdAt,
		})
		.from(contentEntries)
		.where(and(...conditions))
		.orderBy(orderBy)

	return Response.json({
		collection: {
			name: collection.name,
			slug: collection.slug,
			description: collection.description,
		},
		entries,
	})
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
