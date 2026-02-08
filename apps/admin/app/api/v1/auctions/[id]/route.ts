/**
 * Admin API - Auction Detail
 *
 * GET /api/v1/auctions/[id] - Get auction with recent bids
 * PATCH /api/v1/auctions/[id] - Update auction
 * DELETE /api/v1/auctions/[id] - Delete auction (draft only)
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import { auctions, bids, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readAuctions")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [auction] = await db
			.select()
			.from(auctions)
			.where(
				and(
					eq(auctions.id, id),
					eq(auctions.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!auction) {
			return apiError("Auction not found", "NOT_FOUND", 404)
		}

		// Get recent bids (last 20)
		const recentBids = await db
			.select({
				id: bids.id,
				bidderId: bids.bidderId,
				bidderName: users.name,
				bidderEmail: users.email,
				amount: bids.amount,
				maxBid: bids.maxBid,
				isWinning: bids.isWinning,
				createdAt: bids.createdAt,
			})
			.from(bids)
			.leftJoin(users, eq(bids.bidderId, users.id))
			.where(eq(bids.auctionId, id))
			.orderBy(desc(bids.createdAt))
			.limit(20)

		return apiSuccess({
			data: {
				...auction,
				recentBids,
			},
		})
	} catch (error) {
		console.error("Admin API - Get auction error:", error)
		return apiError("Failed to get auction", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeAuctions")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify auction exists and belongs to workspace
		const [existing] = await db
			.select({ id: auctions.id, status: auctions.status })
			.from(auctions)
			.where(
				and(
					eq(auctions.id, id),
					eq(auctions.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Auction not found", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}
		if (body.title !== undefined) updates.title = body.title
		if (body.description !== undefined) updates.description = body.description
		if (body.images !== undefined) updates.images = body.images
		if (body.type !== undefined) updates.type = body.type
		if (body.startingPrice !== undefined) updates.startingPrice = String(body.startingPrice)
		if (body.reservePrice !== undefined) updates.reservePrice = body.reservePrice ? String(body.reservePrice) : null
		if (body.minimumIncrement !== undefined) updates.minimumIncrement = String(body.minimumIncrement)
		if (body.productId !== undefined) updates.productId = body.productId
		if (body.status !== undefined) updates.status = body.status
		if (body.startsAt !== undefined) updates.startsAt = body.startsAt ? new Date(body.startsAt) : null
		if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null
		if (body.autoExtend !== undefined) updates.autoExtend = body.autoExtend
		if (body.autoExtendMinutes !== undefined) updates.autoExtendMinutes = body.autoExtendMinutes
		if (body.metadata !== undefined) updates.metadata = body.metadata

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		updates.updatedAt = new Date()

		const [auction] = await db
			.update(auctions)
			.set(updates)
			.where(eq(auctions.id, id))
			.returning()

		return apiSuccess({ data: auction })
	} catch (error) {
		console.error("Admin API - Update auction error:", error)
		return apiError("Failed to update auction", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeAuctions")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [existing] = await db
			.select({ id: auctions.id, status: auctions.status })
			.from(auctions)
			.where(
				and(
					eq(auctions.id, id),
					eq(auctions.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Auction not found", "NOT_FOUND", 404)
		}

		if (existing.status !== "draft") {
			return apiError(
				"Only draft auctions can be deleted. Cancel the auction first if it is active.",
				"NOT_ALLOWED",
				400
			)
		}

		await db.delete(auctions).where(eq(auctions.id, id))

		return apiSuccess({ data: { id, deleted: true } })
	} catch (error) {
		console.error("Admin API - Delete auction error:", error)
		return apiError("Failed to delete auction", "INTERNAL_ERROR", 500)
	}
}
