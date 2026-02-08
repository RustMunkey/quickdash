import { inngest } from "../inngest"
import { pusherServer } from "../pusher-server"
import { wsChannel } from "../pusher-channels"
import { db } from "@quickdash/db"
import { auctions, bids, auctionWatchers, notifications } from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"

// ============================================================================
// EVENT-DRIVEN AUCTION HANDLERS
// ============================================================================
// Instead of polling crons, these handlers are triggered by events and use
// step.sleepUntil() to execute at exact times. This dramatically reduces
// Inngest usage from ~8,640 invocations/month (5-min cron) to only 3 per auction.
// ============================================================================

/**
 * Handle auction scheduled for start
 * Triggered when auction is published with a future start time
 */
export const handleAuctionScheduledStart = inngest.createFunction(
	{
		id: "auction-scheduled-start",
		// Cancel if a newer event comes in for this auction (reschedule)
		cancelOn: [
			{
				event: "auction/scheduled",
				match: "data.auctionId",
			},
			{
				event: "auction/cancelled",
				match: "data.auctionId",
			},
		],
	},
	{ event: "auction/scheduled" },
	async ({ event, step }) => {
		const { auctionId, startsAt, endsAt, title, workspaceId } = event.data

		// Sleep until start time
		await step.sleepUntil("wait-for-start", new Date(startsAt))

		// Start the auction
		const auction = await step.run("start-auction", async () => {
			const [updated] = await db
				.update(auctions)
				.set({ status: "active", updatedAt: new Date() })
				.where(and(eq(auctions.id, auctionId), eq(auctions.status, "scheduled")))
				.returning()

			return updated
		})

		if (!auction) {
			// Auction was cancelled or already started
			return { skipped: true, reason: "Auction not in scheduled state" }
		}

		// Notify via Pusher
		await step.run("notify-start", async () => {
			if (!pusherServer) return

			await pusherServer.trigger(wsChannel(workspaceId, "auctions"), "auctions:started", {
				auctions: [{
					auctionId: auction.id,
					title: auction.title,
					workspaceId: auction.workspaceId,
				}],
				count: 1,
			})
		})

		// Schedule the ending soon notification and end
		await step.sendEvent("schedule-end-events", [
			{
				name: "auction/ending-soon",
				data: {
					auctionId,
					endsAt,
					title,
					workspaceId,
				},
			},
			{
				name: "auction/scheduled-end",
				data: {
					auctionId,
					endsAt,
					title,
					workspaceId,
				},
			},
		])

		console.log(`[Auction] Started: ${title}`)
		return { started: true, auctionId }
	}
)

/**
 * Handle auction ending soon notification
 * Sleeps until 5 minutes before end time, then notifies watchers
 */
export const handleAuctionEndingSoon = inngest.createFunction(
	{
		id: "auction-ending-soon",
		cancelOn: [
			{
				event: "auction/rescheduled",
				match: "data.auctionId",
			},
			{
				event: "auction/cancelled",
				match: "data.auctionId",
			},
			{
				event: "auction/ended",
				match: "data.auctionId",
			},
		],
	},
	{ event: "auction/ending-soon" },
	async ({ event, step }) => {
		const { auctionId, endsAt, title, workspaceId } = event.data

		// Calculate 5 minutes before end
		const endTime = new Date(endsAt)
		const notifyTime = new Date(endTime.getTime() - 5 * 60 * 1000)

		// If we're already past the notify time, skip
		if (notifyTime <= new Date()) {
			return { skipped: true, reason: "Already past notify time" }
		}

		// Sleep until 5 minutes before end
		await step.sleepUntil("wait-for-notify-time", notifyTime)

		// Verify auction is still active
		const [auction] = await step.run("verify-auction", async () => {
			return db
				.select({
					id: auctions.id,
					status: auctions.status,
					currentBid: auctions.currentBid,
					endsAt: auctions.endsAt,
				})
				.from(auctions)
				.where(eq(auctions.id, auctionId))
				.limit(1)
		})

		if (!auction || auction.status !== "active") {
			return { skipped: true, reason: "Auction no longer active" }
		}

		// Check if end time was extended (auto-extend feature)
		if (auction.endsAt && new Date(auction.endsAt).getTime() !== endTime.getTime()) {
			// End time changed, this event is stale - a new one will be scheduled
			return { skipped: true, reason: "End time was extended" }
		}

		// Notify Pusher
		await step.run("pusher-notify", async () => {
			if (!pusherServer) return

			await pusherServer.trigger(wsChannel(workspaceId, "auctions"), "auctions:ending-soon", {
				auctions: [{
					auctionId,
					title,
					endsAt: endTime.toISOString(),
					currentBid: auction.currentBid,
				}],
				count: 1,
			})
		})

		// Create notifications for watchers
		await step.run("notify-watchers", async () => {
			const watchers = await db
				.select({ userId: auctionWatchers.userId })
				.from(auctionWatchers)
				.where(eq(auctionWatchers.auctionId, auctionId))

			if (watchers.length === 0) return

			const notificationValues = watchers.map((w) => ({
				workspaceId,
				userId: w.userId,
				type: "auction_ending",
				title: "Auction Ending Soon",
				body: `The auction "${title}" ends in 5 minutes!`,
				link: `/auctions/${auctionId}`,
				metadata: {
					auctionId,
					endsAt: endTime.toISOString(),
				},
			}))

			await db.insert(notifications).values(notificationValues)
		})

		console.log(`[Auction] Ending soon notification sent: ${title}`)
		return { notified: true, auctionId }
	}
)

/**
 * Handle scheduled auction end
 * Sleeps until end time, then closes the auction
 */
export const handleAuctionScheduledEnd = inngest.createFunction(
	{
		id: "auction-scheduled-end",
		cancelOn: [
			{
				event: "auction/rescheduled",
				match: "data.auctionId",
			},
			{
				event: "auction/cancelled",
				match: "data.auctionId",
			},
			{
				event: "auction/ended",
				match: "data.auctionId",
			},
		],
	},
	{ event: "auction/scheduled-end" },
	async ({ event, step }) => {
		const { auctionId, endsAt } = event.data
		const endTime = new Date(endsAt)

		// Sleep until end time
		await step.sleepUntil("wait-for-end", endTime)

		// Get current auction state
		const auction = await step.run("get-auction", async () => {
			const [a] = await db
				.select()
				.from(auctions)
				.where(eq(auctions.id, auctionId))
				.limit(1)
			return a
		})

		if (!auction) {
			return { error: "Auction not found" }
		}

		if (auction.status !== "active") {
			return { skipped: true, reason: "Auction not active" }
		}

		// Check if end time was extended (auto-extend feature)
		if (auction.endsAt && new Date(auction.endsAt).getTime() !== endTime.getTime()) {
			// End time changed - this event is stale, a new one will be scheduled
			return { skipped: true, reason: "End time was extended" }
		}

		// Determine outcome
		const now = new Date()
		const hasBids = auction.bidCount > 0
		const reserveMet = auction.type === "no_reserve" || auction.reserveMet

		let finalStatus: "sold" | "unsold"
		let winnerId: string | null = null
		let winningBid: string | null = null

		if (hasBids && reserveMet) {
			finalStatus = "sold"
			winnerId = auction.currentBidderId
			winningBid = auction.currentBid
		} else {
			finalStatus = "unsold"
		}

		// End the auction
		await step.run("end-auction", async () => {
			await db
				.update(auctions)
				.set({
					status: finalStatus,
					winnerId,
					winningBid,
					soldAt: finalStatus === "sold" ? now : null,
					updatedAt: now,
				})
				.where(eq(auctions.id, auctionId))

			// Mark winning bid
			if (winnerId && winningBid) {
				await db
					.update(bids)
					.set({ isWinning: true })
					.where(
						and(
							eq(bids.auctionId, auctionId),
							eq(bids.bidderId, winnerId),
							eq(bids.amount, winningBid)
						)
					)
			}
		})

		// Notify via Pusher
		await step.run("notify-ended", async () => {
			if (!pusherServer) return

			await pusherServer.trigger(wsChannel(auction.workspaceId, "auctions"), "auction:ended", {
				auctionId,
				title: auction.title,
				status: finalStatus,
				winnerId,
				winningBid,
			})
		})

		// Create notification for winner
		if (finalStatus === "sold" && winnerId && winningBid) {
			await step.run("notify-winner", async () => {
				await db.insert(notifications).values({
					workspaceId: auction.workspaceId,
					userId: winnerId!,
					type: "auction_won",
					title: "Auction Won!",
					body: `You won the auction "${auction.title}" with a bid of $${parseFloat(winningBid!).toFixed(2)}`,
					link: `/auctions/${auctionId}`,
					metadata: {
						auctionId,
						winningBid,
					},
				})
			})
		}

		// Send event for workflow triggers
		await step.sendEvent("auction-ended-event", {
			name: "auction/ended",
			data: {
				auctionId,
				status: finalStatus,
				winnerId,
				winningBid,
			},
		})

		console.log(`[Auction] Ended: ${auction.title} - ${finalStatus}`)
		return { ended: true, auctionId, status: finalStatus, winnerId, winningBid }
	}
)

/**
 * Handle auction rescheduled (when end time is extended due to bids)
 * Cancels the old end events and schedules new ones
 */
export const handleAuctionRescheduled = inngest.createFunction(
	{ id: "auction-rescheduled" },
	{ event: "auction/rescheduled" },
	async ({ event, step }) => {
		const { auctionId, newEndsAt, title, workspaceId } = event.data

		// Send new events to replace the cancelled ones
		await step.sendEvent("schedule-new-end-events", [
			{
				name: "auction/ending-soon",
				data: {
					auctionId,
					endsAt: newEndsAt,
					title,
					workspaceId,
				},
			},
			{
				name: "auction/scheduled-end",
				data: {
					auctionId,
					endsAt: newEndsAt,
					title,
					workspaceId,
				},
			},
		])

		console.log(`[Auction] Rescheduled end time: ${title} -> ${newEndsAt}`)
		return { rescheduled: true, auctionId, newEndsAt }
	}
)

/**
 * Handle new bid placed - for outbid notifications
 * Already event-driven, keeping as-is
 */
export const handleBidPlaced = inngest.createFunction(
	{ id: "handle-auction-bid-placed" },
	{ event: "auction/bid-placed" },
	async ({ event, step }) => {
		const { auctionId, amount, bidderId, bidderName, previousBidderId } = event.data

		// Get auction details
		const [auction] = await step.run("get-auction", async () => {
			return db
				.select({
					id: auctions.id,
					title: auctions.title,
					workspaceId: auctions.workspaceId,
				})
				.from(auctions)
				.where(eq(auctions.id, auctionId))
				.limit(1)
		})

		if (!auction) {
			return { error: "Auction not found" }
		}

		// Notify outbid user if there was a previous bidder
		if (previousBidderId && previousBidderId !== bidderId) {
			await step.run("notify-outbid", async () => {
				await db.insert(notifications).values({
					workspaceId: auction.workspaceId,
					userId: previousBidderId,
					type: "auction_outbid",
					title: "You've Been Outbid!",
					body: `Someone placed a higher bid of $${parseFloat(amount).toFixed(2)} on "${auction.title}"`,
					link: `/auctions/${auctionId}`,
					metadata: {
						auctionId,
						newBid: amount,
					},
				})
			})
		}

		return { success: true }
	}
)

export const auctionHandlers = [
	handleAuctionScheduledStart,
	handleAuctionEndingSoon,
	handleAuctionScheduledEnd,
	handleAuctionRescheduled,
	handleBidPlaced,
]
