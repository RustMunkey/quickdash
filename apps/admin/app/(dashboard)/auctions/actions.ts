"use server"

import { eq, and, desc, count, sql, gte, lte, or, asc, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { auctions, bids, auctionWatchers, users, products } from "@quickdash/db/schema"
import type { Auction, NewAuction, Bid } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { inngest } from "@/lib/inngest"

// Permission check helper
async function requireAuctionsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts") // Reuse products permission
	if (!canManage) {
		throw new Error("You don't have permission to manage auctions")
	}
	return workspace
}

// Valid status values
const AUCTION_STATUSES = ["draft", "scheduled", "active", "ended", "sold", "unsold", "cancelled"] as const
type AuctionStatus = (typeof AUCTION_STATUSES)[number]

// ============================================================================
// READ OPERATIONS
// ============================================================================

interface GetAuctionsParams {
	page?: number
	pageSize?: number
	status?: AuctionStatus | "all"
	search?: string
}

export async function getAuctions(params: GetAuctionsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status, search } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(auctions.workspaceId, workspace.id)]

	if (status && status !== "all") {
		conditions.push(eq(auctions.status, status))
	}

	if (search) {
		conditions.push(sql`${auctions.title} ILIKE ${`%${search}%`}`)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: auctions.id,
				title: auctions.title,
				type: auctions.type,
				status: auctions.status,
				startingPrice: auctions.startingPrice,
				currentBid: auctions.currentBid,
				bidCount: auctions.bidCount,
				reserveMet: auctions.reserveMet,
				startsAt: auctions.startsAt,
				endsAt: auctions.endsAt,
				createdAt: auctions.createdAt,
				images: auctions.images,
			})
			.from(auctions)
			.where(where)
			.orderBy(desc(auctions.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(auctions).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function getActiveAuctions(params: Omit<GetAuctionsParams, "status"> = {}) {
	return getAuctions({ ...params, status: "active" })
}

export async function getDraftAuctions(params: Omit<GetAuctionsParams, "status"> = {}) {
	return getAuctions({ ...params, status: "draft" })
}

export async function getClosedAuctions(params: GetAuctionsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search } = params
	const offset = (page - 1) * pageSize

	const conditions = [
		eq(auctions.workspaceId, workspace.id),
		or(
			eq(auctions.status, "ended"),
			eq(auctions.status, "sold"),
			eq(auctions.status, "unsold"),
			eq(auctions.status, "cancelled")
		),
	]

	if (search) {
		conditions.push(sql`${auctions.title} ILIKE ${`%${search}%`}`)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: auctions.id,
				title: auctions.title,
				type: auctions.type,
				status: auctions.status,
				startingPrice: auctions.startingPrice,
				currentBid: auctions.currentBid,
				winningBid: auctions.winningBid,
				bidCount: auctions.bidCount,
				reserveMet: auctions.reserveMet,
				startsAt: auctions.startsAt,
				endsAt: auctions.endsAt,
				soldAt: auctions.soldAt,
				createdAt: auctions.createdAt,
				images: auctions.images,
			})
			.from(auctions)
			.where(where)
			.orderBy(desc(auctions.endsAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(auctions).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function getAuction(id: string) {
	const workspace = await requireWorkspace()

	const [auction] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!auction) throw new Error("Auction not found")

	// Get linked product if any
	let product = null
	if (auction.productId) {
		const [p] = await db
			.select({ id: products.id, name: products.name, slug: products.slug, thumbnail: products.thumbnail })
			.from(products)
			.where(eq(products.id, auction.productId))
			.limit(1)
		product = p ?? null
	}

	// Get current high bidder info
	let currentBidder = null
	if (auction.currentBidderId) {
		const [u] = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, auction.currentBidderId))
			.limit(1)
		currentBidder = u ?? null
	}

	// Get winner info if sold
	let winner = null
	if (auction.winnerId) {
		const [u] = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, auction.winnerId))
			.limit(1)
		winner = u ?? null
	}

	return { ...auction, product, currentBidder, winner }
}

export async function getBidHistory(auctionId: string, limit = 50) {
	const workspace = await requireWorkspace()

	// Verify auction belongs to workspace
	const [auction] = await db
		.select({ id: auctions.id })
		.from(auctions)
		.where(and(eq(auctions.id, auctionId), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!auction) throw new Error("Auction not found")

	const bidHistory = await db
		.select({
			id: bids.id,
			amount: bids.amount,
			isWinning: bids.isWinning,
			createdAt: bids.createdAt,
			bidderName: users.name,
			bidderEmail: users.email,
		})
		.from(bids)
		.leftJoin(users, eq(bids.bidderId, users.id))
		.where(eq(bids.auctionId, auctionId))
		.orderBy(desc(bids.createdAt))
		.limit(limit)

	return bidHistory
}

// ============================================================================
// CREATE/UPDATE OPERATIONS
// ============================================================================

interface CreateAuctionData {
	title: string
	description?: string
	images?: string[]
	type: "reserve" | "no_reserve"
	startingPrice: string
	reservePrice?: string
	minimumIncrement?: string
	startsAt?: Date
	endsAt?: Date
	autoExtend?: boolean
	autoExtendMinutes?: number
	productId?: string
	metadata?: Record<string, unknown>
}

export async function createAuction(data: CreateAuctionData) {
	const workspace = await requireAuctionsPermission()

	const [auction] = await db
		.insert(auctions)
		.values({
			workspaceId: workspace.id,
			title: data.title,
			description: data.description,
			images: data.images ?? [],
			type: data.type,
			startingPrice: data.startingPrice,
			reservePrice: data.type === "reserve" ? data.reservePrice : null,
			minimumIncrement: data.minimumIncrement ?? "1.00",
			startsAt: data.startsAt,
			endsAt: data.endsAt,
			autoExtend: data.autoExtend ?? true,
			autoExtendMinutes: data.autoExtendMinutes ?? 5,
			productId: data.productId,
			metadata: data.metadata ?? {},
			status: "draft",
		})
		.returning()

	await logAudit({
		action: "auction.created",
		targetType: "auction",
		targetId: auction.id,
		targetLabel: data.title,
	})

	return auction
}

interface UpdateAuctionData {
	title?: string
	description?: string
	images?: string[]
	type?: "reserve" | "no_reserve"
	startingPrice?: string
	reservePrice?: string
	minimumIncrement?: string
	startsAt?: Date
	endsAt?: Date
	autoExtend?: boolean
	autoExtendMinutes?: number
	productId?: string | null
	metadata?: Record<string, unknown>
}

export async function updateAuction(id: string, data: UpdateAuctionData) {
	const workspace = await requireAuctionsPermission()

	// Verify auction exists and is editable (draft or scheduled only)
	const [existing] = await db
		.select({ status: auctions.status })
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Auction not found")
	if (!["draft", "scheduled"].includes(existing.status)) {
		throw new Error("Can only edit draft or scheduled auctions")
	}

	const [auction] = await db
		.update(auctions)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "auction.updated",
		targetType: "auction",
		targetId: id,
		targetLabel: auction.title,
	})

	return auction
}

// ============================================================================
// STATUS OPERATIONS
// ============================================================================

export async function publishAuction(id: string) {
	const workspace = await requireAuctionsPermission()

	const [existing] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Auction not found")
	if (existing.status !== "draft") throw new Error("Can only publish draft auctions")
	if (!existing.startsAt || !existing.endsAt) throw new Error("Start and end times are required")

	const now = new Date()
	const newStatus = existing.startsAt <= now ? "active" : "scheduled"

	const [auction] = await db
		.update(auctions)
		.set({
			status: newStatus,
			updatedAt: now,
		})
		.where(eq(auctions.id, id))
		.returning()

	await logAudit({
		action: "auction.published",
		targetType: "auction",
		targetId: id,
		targetLabel: auction.title,
	})

	// Broadcast to real-time subscribers
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "auctions"), "auction:created", {
			auctionId: auction.id,
			title: auction.title,
			status: auction.status,
			startsAt: auction.startsAt?.toISOString(),
			endsAt: auction.endsAt?.toISOString(),
		}).catch(console.error)
	}

	// Schedule Inngest events for auction lifecycle
	if (newStatus === "scheduled") {
		// Schedule start event - will sleep until startsAt
		await inngest.send({
			name: "auction/scheduled",
			data: {
				auctionId: auction.id,
				startsAt: auction.startsAt!.toISOString(),
				endsAt: auction.endsAt!.toISOString(),
				title: auction.title,
				workspaceId: workspace.id,
			},
		}).catch(console.error)
	} else {
		// Already active - schedule end events directly
		await inngest.send([
			{
				name: "auction/ending-soon",
				data: {
					auctionId: auction.id,
					endsAt: auction.endsAt!.toISOString(),
					title: auction.title,
					workspaceId: workspace.id,
				},
			},
			{
				name: "auction/scheduled-end",
				data: {
					auctionId: auction.id,
					endsAt: auction.endsAt!.toISOString(),
					title: auction.title,
					workspaceId: workspace.id,
				},
			},
		]).catch(console.error)
	}

	return auction
}

export async function cancelAuction(id: string, reason?: string) {
	const workspace = await requireAuctionsPermission()

	const [existing] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Auction not found")
	if (["ended", "sold", "unsold", "cancelled"].includes(existing.status)) {
		throw new Error("Auction is already closed")
	}

	const [auction] = await db
		.update(auctions)
		.set({
			status: "cancelled",
			updatedAt: new Date(),
			metadata: { ...existing.metadata, cancelReason: reason },
		})
		.where(eq(auctions.id, id))
		.returning()

	await logAudit({
		action: "auction.cancelled",
		targetType: "auction",
		targetId: id,
		targetLabel: auction.title,
		metadata: { reason },
	})

	// Broadcast cancellation
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "auctions"), "auction:ended", {
			auctionId: auction.id,
			status: "cancelled",
			reason,
		}).catch(console.error)
	}

	// Cancel any scheduled Inngest functions for this auction
	await inngest.send({
		name: "auction/cancelled",
		data: {
			auctionId: id,
			reason,
		},
	}).catch(console.error)

	// TODO: Notify bidders via email/notification

	return auction
}

export async function endAuction(id: string) {
	const workspace = await requireAuctionsPermission()

	const [existing] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Auction not found")
	if (existing.status !== "active") throw new Error("Can only end active auctions")

	const now = new Date()
	let finalStatus: AuctionStatus = "ended"
	let winnerId = null
	let winningBid = null

	// Determine outcome
	if (existing.bidCount > 0 && existing.currentBid && existing.currentBidderId) {
		const currentBidNum = parseFloat(existing.currentBid)

		if (existing.type === "no_reserve") {
			// No reserve - highest bidder wins
			finalStatus = "sold"
			winnerId = existing.currentBidderId
			winningBid = existing.currentBid
		} else if (existing.reserveMet) {
			// Reserve met - highest bidder wins
			finalStatus = "sold"
			winnerId = existing.currentBidderId
			winningBid = existing.currentBid
		} else {
			// Reserve not met
			finalStatus = "unsold"
		}
	} else {
		// No bids
		finalStatus = "unsold"
	}

	const [auction] = await db
		.update(auctions)
		.set({
			status: finalStatus,
			winnerId,
			winningBid,
			soldAt: finalStatus === "sold" ? now : null,
			updatedAt: now,
		})
		.where(eq(auctions.id, id))
		.returning()

	// Mark winning bid
	if (winnerId) {
		await db
			.update(bids)
			.set({ isWinning: true })
			.where(
				and(
					eq(bids.auctionId, id),
					eq(bids.bidderId, winnerId),
					eq(bids.amount, winningBid!)
				)
			)
	}

	await logAudit({
		action: "auction.ended",
		targetType: "auction",
		targetId: id,
		targetLabel: auction.title,
		metadata: { status: finalStatus, winnerId, winningBid },
	})

	// Broadcast end
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "auctions"), "auction:ended", {
			auctionId: auction.id,
			status: finalStatus,
			winnerId,
			winningBid,
		}).catch(console.error)
	}

	// TODO: Notify winner and other bidders

	return auction
}

// ============================================================================
// BIDDING
// ============================================================================

interface PlaceBidData {
	auctionId: string
	amount: string
	maxBid?: string
	bidderId?: string // Optional - uses current user if not provided
}

export async function placeBid(data: PlaceBidData) {
	const workspace = await requireWorkspace()

	// Get current user if bidderId not provided
	let bidderId = data.bidderId
	if (!bidderId) {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) throw new Error("Not authenticated")
		bidderId = session.user.id
	}

	const [auction] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, data.auctionId), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!auction) throw new Error("Auction not found")
	if (auction.status !== "active") throw new Error("Auction is not active")

	const now = new Date()
	if (auction.endsAt && auction.endsAt < now) {
		throw new Error("Auction has ended")
	}

	const bidAmount = parseFloat(data.amount)
	const currentBidAmount = auction.currentBid ? parseFloat(auction.currentBid) : 0
	const startingPrice = parseFloat(auction.startingPrice)
	const minimumIncrement = auction.minimumIncrement ? parseFloat(auction.minimumIncrement) : 1

	// Validate bid amount
	if (auction.bidCount === 0) {
		if (bidAmount < startingPrice) {
			throw new Error(`Bid must be at least $${startingPrice.toFixed(2)}`)
		}
	} else {
		const minimumBid = currentBidAmount + minimumIncrement
		if (bidAmount < minimumBid) {
			throw new Error(`Bid must be at least $${minimumBid.toFixed(2)}`)
		}
	}

	// Can't bid on your own auction (check if bidder is workspace owner - simplified check)
	if (auction.currentBidderId === bidderId) {
		throw new Error("You are already the highest bidder")
	}

	// Get bidder info for Pusher event
	const [bidder] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, bidderId))
		.limit(1)

	// Create bid
	const [bid] = await db
		.insert(bids)
		.values({
			auctionId: data.auctionId,
			bidderId,
			amount: data.amount,
			maxBid: data.maxBid,
		})
		.returning()

	// Check if reserve is met
	const reserveMet = auction.type === "no_reserve" ||
		(auction.reservePrice && bidAmount >= parseFloat(auction.reservePrice))

	// Check if we need to auto-extend
	let newEndsAt = auction.endsAt
	if (auction.autoExtend && auction.endsAt) {
		const minutesUntilEnd = (auction.endsAt.getTime() - now.getTime()) / 60000
		if (minutesUntilEnd <= (auction.autoExtendMinutes ?? 5)) {
			newEndsAt = new Date(auction.endsAt.getTime() + (auction.autoExtendMinutes ?? 5) * 60000)
		}
	}

	// Update auction
	const [updatedAuction] = await db
		.update(auctions)
		.set({
			currentBid: data.amount,
			currentBidderId: bidderId,
			bidCount: auction.bidCount + 1,
			reserveMet: reserveMet || auction.reserveMet,
			endsAt: newEndsAt,
			updatedAt: now,
		})
		.where(eq(auctions.id, data.auctionId))
		.returning()

	// Broadcast bid event
	if (pusherServer) {
		const eventData = {
			auctionId: data.auctionId,
			bidId: bid.id,
			amount: data.amount,
			bidderName: bidder?.name ?? "Anonymous",
			bidCount: updatedAuction.bidCount,
			previousBid: auction.currentBid,
			reserveMet: updatedAuction.reserveMet,
		}

		await pusherServer.trigger(wsChannel(workspace.id, "auctions"), "auction:bid-placed", eventData).catch(console.error)

		// If auction was extended, broadcast that too
		if (newEndsAt !== auction.endsAt) {
			await pusherServer.trigger(wsChannel(workspace.id, "auctions"), "auction:extended", {
				auctionId: data.auctionId,
				newEndsAt: newEndsAt?.toISOString(),
				reason: "Bid placed near end time",
			}).catch(console.error)
		}

		// Notify previous high bidder they've been outbid
		if (auction.currentBidderId && auction.currentBidderId !== bidderId) {
			await pusherServer.trigger(`private-user-${auction.currentBidderId}`, "notification", {
				type: "auction_outbid",
				title: `Outbid on "${auction.title}"`,
				body: `New bid: $${bidAmount.toFixed(2)}`,
				link: `/auctions/${data.auctionId}`,
			}).catch(console.error)
		}
	}

	// Send Inngest events for async processing
	const inngestEvents: Array<{ name: string; data: Record<string, unknown> }> = [
		{
			name: "auction/bid-placed",
			data: {
				auctionId: data.auctionId,
				bidId: bid.id,
				amount: data.amount,
				bidderId,
				bidderName: bidder?.name ?? "Anonymous",
				previousBidderId: auction.currentBidderId,
			},
		},
	]

	// If auction was extended, reschedule the end events
	if (newEndsAt && newEndsAt !== auction.endsAt) {
		inngestEvents.push({
			name: "auction/rescheduled",
			data: {
				auctionId: data.auctionId,
				newEndsAt: newEndsAt.toISOString(),
				title: auction.title,
				workspaceId: workspace.id,
			},
		})
	}

	await inngest.send(inngestEvents).catch(console.error)

	return { bid, auction: updatedAuction }
}

// ============================================================================
// WATCHERS
// ============================================================================

export async function watchAuction(auctionId: string) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")

	// Verify auction exists
	const [auction] = await db
		.select({ id: auctions.id })
		.from(auctions)
		.where(and(eq(auctions.id, auctionId), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!auction) throw new Error("Auction not found")

	// Add watcher (upsert)
	await db
		.insert(auctionWatchers)
		.values({
			auctionId,
			userId: session.user.id,
		})
		.onConflictDoNothing()

	return { success: true }
}

export async function unwatchAuction(auctionId: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")

	await db
		.delete(auctionWatchers)
		.where(
			and(eq(auctionWatchers.auctionId, auctionId), eq(auctionWatchers.userId, session.user.id))
		)

	return { success: true }
}

export async function isWatchingAuction(auctionId: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return false

	const [watcher] = await db
		.select({ id: auctionWatchers.id })
		.from(auctionWatchers)
		.where(
			and(eq(auctionWatchers.auctionId, auctionId), eq(auctionWatchers.userId, session.user.id))
		)
		.limit(1)

	return !!watcher
}

// ============================================================================
// SCHEDULED AUCTION HELPERS (for Inngest)
// ============================================================================

/**
 * Get auctions that should start (scheduled auctions where startsAt has passed)
 */
export async function getAuctionsToStart() {
	const now = new Date()

	return db
		.select()
		.from(auctions)
		.where(and(eq(auctions.status, "scheduled"), lte(auctions.startsAt, now)))
}

/**
 * Get auctions that should end (active auctions where endsAt has passed)
 */
export async function getAuctionsToEnd() {
	const now = new Date()

	return db
		.select()
		.from(auctions)
		.where(and(eq(auctions.status, "active"), lte(auctions.endsAt, now)))
}

/**
 * Start a scheduled auction (used by Inngest)
 */
export async function startScheduledAuction(id: string) {
	const [auction] = await db
		.update(auctions)
		.set({
			status: "active",
			updatedAt: new Date(),
		})
		.where(and(eq(auctions.id, id), eq(auctions.status, "scheduled")))
		.returning()

	if (auction && pusherServer) {
		await pusherServer.trigger(wsChannel(auction.workspaceId, "auctions"), "auction:created", {
			auctionId: auction.id,
			title: auction.title,
			status: "active",
			startsAt: auction.startsAt?.toISOString(),
			endsAt: auction.endsAt?.toISOString(),
		}).catch(console.error)
	}

	return auction
}

/**
 * End an auction automatically (used by Inngest)
 */
export async function endAuctionAutomatically(id: string) {
	const [existing] = await db
		.select()
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.status, "active")))
		.limit(1)

	if (!existing) return null

	const now = new Date()
	let finalStatus: AuctionStatus = "ended"
	let winnerId = null
	let winningBid = null

	if (existing.bidCount > 0 && existing.currentBid && existing.currentBidderId) {
		if (existing.type === "no_reserve" || existing.reserveMet) {
			finalStatus = "sold"
			winnerId = existing.currentBidderId
			winningBid = existing.currentBid
		} else {
			finalStatus = "unsold"
		}
	} else {
		finalStatus = "unsold"
	}

	const [auction] = await db
		.update(auctions)
		.set({
			status: finalStatus,
			winnerId,
			winningBid,
			soldAt: finalStatus === "sold" ? now : null,
			updatedAt: now,
		})
		.where(eq(auctions.id, id))
		.returning()

	if (winnerId) {
		await db
			.update(bids)
			.set({ isWinning: true })
			.where(
				and(
					eq(bids.auctionId, id),
					eq(bids.bidderId, winnerId),
					eq(bids.amount, winningBid!)
				)
			)
	}

	if (pusherServer) {
		await pusherServer.trigger(wsChannel(auction.workspaceId, "auctions"), "auction:ended", {
			auctionId: auction.id,
			status: finalStatus,
			winnerId,
			winningBid,
		}).catch(console.error)
	}

	return auction
}

/**
 * Get auctions ending soon (for reminder notifications)
 */
export async function getAuctionsEndingSoon(minutesFromNow: number = 5) {
	const now = new Date()
	const soon = new Date(now.getTime() + minutesFromNow * 60000)

	return db
		.select()
		.from(auctions)
		.where(
			and(
				eq(auctions.status, "active"),
				gte(auctions.endsAt, now),
				lte(auctions.endsAt, soon)
			)
		)
}

// ============================================================================
// PRODUCTS LIST FOR AUCTION CREATION
// ============================================================================

export async function getProductsForAuction() {
	const workspace = await requireWorkspace()

	return db
		.select({
			id: products.id,
			name: products.name,
			thumbnail: products.thumbnail,
			price: products.price,
		})
		.from(products)
		.where(and(eq(products.workspaceId, workspace.id), eq(products.isActive, true)))
		.orderBy(asc(products.name))
		.limit(100)
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteAuction(id: string) {
	const workspace = await requireAuctionsPermission()

	const [existing] = await db
		.select({ status: auctions.status, title: auctions.title })
		.from(auctions)
		.where(and(eq(auctions.id, id), eq(auctions.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Auction not found")
	if (!["draft", "cancelled", "unsold"].includes(existing.status)) {
		throw new Error("Cannot delete active or sold auctions")
	}

	await db.delete(auctions).where(eq(auctions.id, id))

	await logAudit({
		action: "auction.deleted",
		targetType: "auction",
		targetId: id,
		targetLabel: existing.title,
	})

	return { success: true }
}

export async function bulkDeleteAuctions(ids: string[]) {
	const workspace = await requireAuctionsPermission()
	await db.delete(auctions).where(and(inArray(auctions.id, ids), eq(auctions.workspaceId, workspace.id)))
}
