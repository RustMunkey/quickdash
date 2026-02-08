import {
	pgTable,
	uuid,
	text,
	timestamp,
	index,
	unique,
} from "drizzle-orm/pg-core"
import { users } from "./users"
import { products } from "./products"
import { workspaces } from "./workspaces"

/**
 * Customer wishlists - tracks products customers want to save
 * Workspace-scoped so the same user can have different wishlists per store
 */
export const wishlists = pgTable(
	"wishlists",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("wishlist_unique").on(table.workspaceId, table.userId, table.productId),
		index("wishlist_user_idx").on(table.userId),
		index("wishlist_workspace_idx").on(table.workspaceId),
	]
)

export type Wishlist = typeof wishlists.$inferSelect
export type NewWishlist = typeof wishlists.$inferInsert
