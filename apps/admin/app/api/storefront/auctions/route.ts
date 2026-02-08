import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, sql, gte } from "@quickdash/db/drizzle"
import { auctions, products } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)

	// Pagination
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
	const offset = (page - 1) * limit

	// Filters
	const status = searchParams.get("status") || "active" // active, scheduled, ended, sold
	const type = searchParams.get("type") // reserve, no_reserve

	// Sorting
	const sortBy = searchParams.get("sort") || "endsAt"
	const sortOrder = searchParams.get("order") || "asc"

	// Build conditions
	const conditions = [
		eq(auctions.workspaceId, storefront.workspaceId),
	]

	// By default, only show active auctions to storefronts
	if (status === "active") {
		conditions.push(eq(auctions.status, "active"))
	} else if (status === "scheduled") {
		conditions.push(eq(auctions.status, "scheduled"))
	} else if (status === "upcoming") {
		// Active or scheduled
		conditions.push(
			sql`${auctions.status} IN ('active', 'scheduled')`
		)
	} else if (status === "ended") {
		conditions.push(
			sql`${auctions.status} IN ('ended', 'sold', 'unsold')`
		)
	}

	if (type) {
		conditions.push(eq(auctions.type, type as "reserve" | "no_reserve"))
	}

	// Build sort
	const sortColumn = {
		endsAt: auctions.endsAt,
		startsAt: auctions.startsAt,
		currentBid: auctions.currentBid,
		bidCount: auctions.bidCount,
		createdAt: auctions.createdAt,
	}[sortBy] || auctions.endsAt

	const orderFn = sortOrder === "asc" ? asc : desc

	// Execute query
	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: auctions.id,
				title: auctions.title,
				description: auctions.description,
				images: auctions.images,
				type: auctions.type,
				status: auctions.status,
				startingPrice: auctions.startingPrice,
				currentBid: auctions.currentBid,
				bidCount: auctions.bidCount,
				reserveMet: auctions.reserveMet,
				startsAt: auctions.startsAt,
				endsAt: auctions.endsAt,
				autoExtend: auctions.autoExtend,
				autoExtendMinutes: auctions.autoExtendMinutes,
				// Linked product
				productId: auctions.productId,
				productName: products.name,
				productSlug: products.slug,
				productThumbnail: products.thumbnail,
			})
			.from(auctions)
			.leftJoin(products, eq(auctions.productId, products.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(auctions)
			.where(and(...conditions)),
	])

	const totalCount = Number(countResult.count)
	const totalPages = Math.ceil(totalCount / limit)

	return Response.json({
		auctions: items.map((a) => ({
			id: a.id,
			title: a.title,
			description: a.description,
			images: a.images,
			type: a.type,
			status: a.status,
			startingPrice: a.startingPrice,
			currentBid: a.currentBid,
			bidCount: a.bidCount,
			reserveMet: a.reserveMet,
			startsAt: a.startsAt,
			endsAt: a.endsAt,
			autoExtend: a.autoExtend,
			autoExtendMinutes: a.autoExtendMinutes,
			product: a.productId
				? {
						id: a.productId,
						name: a.productName,
						slug: a.productSlug,
						thumbnail: a.productThumbnail,
				  }
				: null,
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
