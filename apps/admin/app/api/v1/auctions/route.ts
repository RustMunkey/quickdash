/**
 * Admin API - Auctions
 *
 * GET /api/v1/auctions - List auctions
 * POST /api/v1/auctions - Create auction
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count } from "@quickdash/db/drizzle"
import { auctions } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readAuctions")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const status = searchParams.get("status") as "active" | "draft" | "ended" | "scheduled" | "sold" | "unsold" | "cancelled" | null
	const type = searchParams.get("type") as "reserve" | "no_reserve" | null
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(auctions.workspaceId, auth.workspace.id)]

		if (status) {
			conditions.push(eq(auctions.status, status))
		}
		if (type) {
			conditions.push(eq(auctions.type, type))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(auctions)
			.where(and(...conditions))

		// Get auctions
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "title"
				? auctions.title
				: sortBy === "currentBid"
					? auctions.currentBid
					: sortBy === "endsAt"
						? auctions.endsAt
						: sortBy === "bidCount"
							? auctions.bidCount
							: auctions.createdAt

		const auctionList = await db
			.select({
				id: auctions.id,
				productId: auctions.productId,
				title: auctions.title,
				description: auctions.description,
				images: auctions.images,
				type: auctions.type,
				startingPrice: auctions.startingPrice,
				reservePrice: auctions.reservePrice,
				minimumIncrement: auctions.minimumIncrement,
				currentBid: auctions.currentBid,
				bidCount: auctions.bidCount,
				currentBidderId: auctions.currentBidderId,
				status: auctions.status,
				startsAt: auctions.startsAt,
				endsAt: auctions.endsAt,
				autoExtend: auctions.autoExtend,
				autoExtendMinutes: auctions.autoExtendMinutes,
				winnerId: auctions.winnerId,
				winningBid: auctions.winningBid,
				soldAt: auctions.soldAt,
				reserveMet: auctions.reserveMet,
				metadata: auctions.metadata,
				createdAt: auctions.createdAt,
				updatedAt: auctions.updatedAt,
			})
			.from(auctions)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: auctionList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List auctions error:", error)
		return apiError("Failed to list auctions", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeAuctions")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		// Validate required fields
		if (!body.title || typeof body.title !== "string") {
			return apiError("Auction title is required", "VALIDATION_ERROR", 400)
		}
		if (body.startingPrice === undefined || body.startingPrice === null) {
			return apiError("Starting price is required", "VALIDATION_ERROR", 400)
		}

		const [auction] = await db
			.insert(auctions)
			.values({
				workspaceId: auth.workspace.id,
				title: body.title,
				description: body.description || null,
				images: body.images || [],
				type: body.type || "reserve",
				startingPrice: String(body.startingPrice),
				reservePrice: body.reservePrice ? String(body.reservePrice) : null,
				minimumIncrement: body.minimumIncrement ? String(body.minimumIncrement) : "1.00",
				productId: body.productId || null,
				status: "draft",
				startsAt: body.startsAt ? new Date(body.startsAt) : null,
				endsAt: body.endsAt ? new Date(body.endsAt) : null,
				autoExtend: body.autoExtend !== false,
				autoExtendMinutes: body.autoExtendMinutes ?? 5,
				metadata: body.metadata || {},
			})
			.returning()

		return apiSuccess({ data: auction }, 201)
	} catch (error) {
		console.error("Admin API - Create auction error:", error)
		return apiError("Failed to create auction", "INTERNAL_ERROR", 500)
	}
}
