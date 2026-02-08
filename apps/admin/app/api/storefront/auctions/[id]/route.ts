import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import { auctions, bids, products, users } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { inngest } from "@/lib/inngest"

// GET /api/storefront/auctions/[id] - Get auction details
async function handleGet(
	request: NextRequest,
	storefront: StorefrontContext,
	params: { id: string }
) {
	const { id } = params
	const { searchParams } = new URL(request.url)
	const includeBids = searchParams.get("bids") === "true"
	const bidLimit = Math.min(50, Math.max(1, parseInt(searchParams.get("bidLimit") || "10")))

	// Get auction
	const [auction] = await db
		.select({
			id: auctions.id,
			title: auctions.title,
			description: auctions.description,
			images: auctions.images,
			type: auctions.type,
			status: auctions.status,
			startingPrice: auctions.startingPrice,
			minimumIncrement: auctions.minimumIncrement,
			currentBid: auctions.currentBid,
			bidCount: auctions.bidCount,
			reserveMet: auctions.reserveMet,
			startsAt: auctions.startsAt,
			endsAt: auctions.endsAt,
			autoExtend: auctions.autoExtend,
			autoExtendMinutes: auctions.autoExtendMinutes,
			winnerId: auctions.winnerId,
			winningBid: auctions.winningBid,
			// Linked product
			productId: auctions.productId,
			productName: products.name,
			productSlug: products.slug,
			productThumbnail: products.thumbnail,
		})
		.from(auctions)
		.leftJoin(products, eq(auctions.productId, products.id))
		.where(
			and(
				eq(auctions.id, id),
				eq(auctions.workspaceId, storefront.workspaceId)
			)
		)
		.limit(1)

	if (!auction) {
		return storefrontError("Auction not found", 404)
	}

	// Optionally include recent bids
	let recentBids: Array<{
		id: string
		amount: string
		bidderName: string | null
		createdAt: Date
	}> = []

	if (includeBids) {
		const bidResults = await db
			.select({
				id: bids.id,
				amount: bids.amount,
				bidderName: users.name,
				createdAt: bids.createdAt,
			})
			.from(bids)
			.innerJoin(users, eq(bids.bidderId, users.id))
			.where(eq(bids.auctionId, id))
			.orderBy(desc(bids.createdAt))
			.limit(bidLimit)

		recentBids = bidResults.map((b) => ({
			id: b.id,
			amount: b.amount,
			bidderName: b.bidderName ?? "Anonymous",
			createdAt: b.createdAt,
		}))
	}

	return Response.json({
		auction: {
			id: auction.id,
			title: auction.title,
			description: auction.description,
			images: auction.images,
			type: auction.type,
			status: auction.status,
			startingPrice: auction.startingPrice,
			minimumIncrement: auction.minimumIncrement,
			currentBid: auction.currentBid,
			bidCount: auction.bidCount,
			reserveMet: auction.reserveMet,
			startsAt: auction.startsAt,
			endsAt: auction.endsAt,
			autoExtend: auction.autoExtend,
			autoExtendMinutes: auction.autoExtendMinutes,
			// Only show winner info if auction is sold
			winner:
				auction.status === "sold" && auction.winnerId
					? { winningBid: auction.winningBid }
					: null,
			product: auction.productId
				? {
						id: auction.productId,
						name: auction.productName,
						slug: auction.productSlug,
						thumbnail: auction.productThumbnail,
				  }
				: null,
		},
		bids: recentBids,
	})
}

// POST /api/storefront/auctions/[id] - Place a bid
async function handlePost(
	request: NextRequest,
	storefront: StorefrontContext,
	params: { id: string }
) {
	const { id: auctionId } = params

	// Parse request body
	let body: { amount: number; customerId: string }
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { amount, customerId } = body

	if (!amount || typeof amount !== "number") {
		return storefrontError("amount is required and must be a number", 400)
	}

	if (!customerId || typeof customerId !== "string") {
		return storefrontError("customerId is required", 400)
	}

	// Get auction
	const [auction] = await db
		.select()
		.from(auctions)
		.where(
			and(
				eq(auctions.id, auctionId),
				eq(auctions.workspaceId, storefront.workspaceId)
			)
		)
		.limit(1)

	if (!auction) {
		return storefrontError("Auction not found", 404)
	}

	if (auction.status !== "active") {
		return storefrontError("Auction is not active", 400)
	}

	const now = new Date()
	if (auction.endsAt && new Date(auction.endsAt) < now) {
		return storefrontError("Auction has ended", 400)
	}

	const bidAmount = amount
	const currentBidAmount = auction.currentBid ? parseFloat(auction.currentBid) : 0
	const startingPrice = parseFloat(auction.startingPrice)
	const minimumIncrement = auction.minimumIncrement ? parseFloat(auction.minimumIncrement) : 1

	// Validate bid amount
	if (auction.bidCount === 0) {
		if (bidAmount < startingPrice) {
			return storefrontError(`Bid must be at least $${startingPrice.toFixed(2)}`, 400)
		}
	} else {
		const minimumBid = currentBidAmount + minimumIncrement
		if (bidAmount < minimumBid) {
			return storefrontError(`Bid must be at least $${minimumBid.toFixed(2)}`, 400)
		}
	}

	// Can't outbid yourself
	if (auction.currentBidderId === customerId) {
		return storefrontError("You are already the highest bidder", 400)
	}

	// Get bidder info
	const [bidder] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, customerId))
		.limit(1)

	if (!bidder) {
		return storefrontError("Customer not found", 404)
	}

	// Create bid
	const [bid] = await db
		.insert(bids)
		.values({
			auctionId,
			bidderId: customerId,
			amount: bidAmount.toFixed(2),
		})
		.returning()

	// Check if reserve is met
	const reserveMet =
		auction.type === "no_reserve" ||
		(auction.reservePrice && bidAmount >= parseFloat(auction.reservePrice))

	// Check if we need to auto-extend
	let newEndsAt = auction.endsAt
	if (auction.autoExtend && auction.endsAt) {
		const minutesUntilEnd = (new Date(auction.endsAt).getTime() - now.getTime()) / 60000
		if (minutesUntilEnd <= (auction.autoExtendMinutes ?? 5)) {
			newEndsAt = new Date(
				new Date(auction.endsAt).getTime() + (auction.autoExtendMinutes ?? 5) * 60000
			)
		}
	}

	// Update auction
	const [updatedAuction] = await db
		.update(auctions)
		.set({
			currentBid: bidAmount.toFixed(2),
			currentBidderId: customerId,
			bidCount: auction.bidCount + 1,
			reserveMet: reserveMet || auction.reserveMet,
			endsAt: newEndsAt,
			updatedAt: now,
		})
		.where(eq(auctions.id, auctionId))
		.returning()

	// Broadcast bid event
	if (pusherServer) {
		const eventData = {
			auctionId,
			bidId: bid.id,
			amount: bidAmount.toFixed(2),
			bidderName: bidder.name ?? "Anonymous",
			bidCount: updatedAuction.bidCount,
			previousBid: auction.currentBid,
			reserveMet: updatedAuction.reserveMet,
		}

		await pusherServer.trigger(wsChannel(storefront.workspaceId, "auctions"), "auction:bid-placed", eventData).catch(console.error)

		// If auction was extended, broadcast that too
		if (newEndsAt !== auction.endsAt) {
			await pusherServer
				.trigger(wsChannel(storefront.workspaceId, "auctions"), "auction:extended", {
					auctionId,
					newEndsAt: newEndsAt instanceof Date ? newEndsAt.toISOString() : newEndsAt,
					reason: "Bid placed near end time",
				})
				.catch(console.error)
		}

		// Notify previous high bidder they've been outbid
		if (auction.currentBidderId && auction.currentBidderId !== customerId) {
			await pusherServer
				.trigger(`private-user-${auction.currentBidderId}`, "notification", {
					type: "auction_outbid",
					title: `Outbid on "${auction.title}"`,
					body: `New bid: $${bidAmount.toFixed(2)}`,
					link: `/auctions/${auctionId}`,
				})
				.catch(console.error)
		}
	}

	// Send Inngest event for async processing
	await inngest
		.send({
			name: "auction/bid-placed",
			data: {
				auctionId,
				bidId: bid.id,
				amount: bidAmount.toFixed(2),
				bidderId: customerId,
				bidderName: bidder.name ?? "Anonymous",
				previousBidderId: auction.currentBidderId,
			},
		})
		.catch(console.error)

	return Response.json({
		success: true,
		bid: {
			id: bid.id,
			amount: bid.amount,
			createdAt: bid.createdAt,
		},
		auction: {
			id: updatedAuction.id,
			currentBid: updatedAuction.currentBid,
			bidCount: updatedAuction.bidCount,
			reserveMet: updatedAuction.reserveMet,
			endsAt: updatedAuction.endsAt,
		},
	})
}

// Wrapper to pass params to handler
function createGetHandler() {
	return withStorefrontAuth(
		async (request: NextRequest, storefront: StorefrontContext) => {
			const url = new URL(request.url)
			const id = url.pathname.split("/").pop() || ""
			return handleGet(request, storefront, { id })
		},
		{ requiredPermission: "products" }
	)
}

function createPostHandler() {
	return withStorefrontAuth(
		async (request: NextRequest, storefront: StorefrontContext) => {
			const url = new URL(request.url)
			const id = url.pathname.split("/").pop() || ""
			return handlePost(request, storefront, { id })
		},
		{ requiredPermission: "products" }
	)
}

export const GET = createGetHandler()
export const POST = createPostHandler()
export const OPTIONS = handleCorsOptions
