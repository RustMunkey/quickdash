import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core"
import { users } from "./users"

// User Presence - tracks online users
export const userPresence = pgTable("user_presence", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
	status: text("status").notNull().default("online"), // online, away, busy, offline
	currentPage: text("current_page"), // e.g., "/orders/123"
	currentResource: text("current_resource"), // e.g., "order:abc123"
	lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
	connectedAt: timestamp("connected_at").defaultNow().notNull(),
})

// Page Viewers - tracks who is viewing what resource
export const pageViewers = pgTable("page_viewers", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	resourceType: text("resource_type").notNull(), // order, product, customer
	resourceId: text("resource_id").notNull(),
	viewingSince: timestamp("viewing_since").defaultNow().notNull(),
}, (table) => [
	unique("page_viewers_user_resource").on(table.userId, table.resourceType, table.resourceId),
])
