import {
	pgTable,
	text,
	uuid,
	decimal,
	boolean,
	timestamp,
	jsonb,
	index,
	unique,
	integer,
} from "drizzle-orm/pg-core"
import { products } from "./products"
import { users } from "./users"
import { workspaces } from "./workspaces"

/**
 * Auctions table - main auction records
 * Supports both reserve and no-reserve auction types
 */
export const auctions = pgTable(
	"auctions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		productId: uuid("product_id").references(() => products.id, {
			onDelete: "set null",
		}),

		// Auction details
		title: text("title").notNull(),
		description: text("description"),
		images: jsonb("images").$type<string[]>().default([]),

		// Auction type: reserve requires minimum price to be met, no_reserve sells to highest bidder
		type: text("type", { enum: ["reserve", "no_reserve"] })
			.notNull()
			.default("reserve"),

		// Pricing
		startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull(),
		reservePrice: decimal("reserve_price", { precision: 10, scale: 2 }), // null for no_reserve
		minimumIncrement: decimal("minimum_increment", { precision: 10, scale: 2 }).default("1.00"),
		currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
		bidCount: integer("bid_count").default(0).notNull(),

		// Current highest bidder
		currentBidderId: text("current_bidder_id").references(() => users.id),

		// Status: draft → scheduled → active → ended/sold/unsold/cancelled
		status: text("status", {
			enum: ["draft", "scheduled", "active", "ended", "sold", "unsold", "cancelled"],
		})
			.notNull()
			.default("draft"),

		// Timing
		startsAt: timestamp("starts_at"),
		endsAt: timestamp("ends_at"),

		// Auto-extend: if bid placed in last X minutes, extend auction by X minutes
		autoExtend: boolean("auto_extend").default(true),
		autoExtendMinutes: integer("auto_extend_minutes").default(5),

		// Outcome (filled when auction ends)
		winnerId: text("winner_id").references(() => users.id),
		winningBid: decimal("winning_bid", { precision: 10, scale: 2 }),
		soldAt: timestamp("sold_at"),

		// Reserve met tracking
		reserveMet: boolean("reserve_met").default(false),

		// Flexible metadata for custom fields
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("auctions_workspace_idx").on(table.workspaceId),
		index("auctions_status_idx").on(table.status),
		index("auctions_ends_at_idx").on(table.endsAt),
		index("auctions_product_idx").on(table.productId),
		index("auctions_starts_at_idx").on(table.startsAt),
	]
)

/**
 * Bids table - tracks all bids placed on auctions
 */
export const bids = pgTable(
	"bids",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		auctionId: uuid("auction_id")
			.notNull()
			.references(() => auctions.id, { onDelete: "cascade" }),
		bidderId: text("bidder_id")
			.notNull()
			.references(() => users.id),

		// Bid amount
		amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),

		// Optional max bid for auto-bidding (proxy bidding)
		// System will automatically bid up to this amount when outbid
		maxBid: decimal("max_bid", { precision: 10, scale: 2 }),

		// Was this the winning bid?
		isWinning: boolean("is_winning").default(false),

		// Metadata for fraud prevention
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("bids_auction_idx").on(table.auctionId),
		index("bids_bidder_idx").on(table.bidderId),
		index("bids_amount_idx").on(table.amount),
		index("bids_created_at_idx").on(table.createdAt),
	]
)

/**
 * Auction watchers - users who want to be notified about auction updates
 */
export const auctionWatchers = pgTable(
	"auction_watchers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		auctionId: uuid("auction_id")
			.notNull()
			.references(() => auctions.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// Notification preferences
		notifyOnBid: boolean("notify_on_bid").default(true),
		notifyOnEndingSoon: boolean("notify_on_ending_soon").default(true),
		notifyOnEnd: boolean("notify_on_end").default(true),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("auction_watcher_unique").on(table.auctionId, table.userId),
		index("auction_watchers_auction_idx").on(table.auctionId),
		index("auction_watchers_user_idx").on(table.userId),
	]
)

// Type exports for use in actions
export type Auction = typeof auctions.$inferSelect
export type NewAuction = typeof auctions.$inferInsert
export type Bid = typeof bids.$inferSelect
export type NewBid = typeof bids.$inferInsert
export type AuctionWatcher = typeof auctionWatchers.$inferSelect
export type NewAuctionWatcher = typeof auctionWatchers.$inferInsert
