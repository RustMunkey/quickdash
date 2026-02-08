import {
	pgTable,
	text,
	uuid,
	integer,
	boolean,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { products, productVariants } from "./products";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const reviews = pgTable(
	"reviews",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		productId: uuid("product_id")
		.notNull()
		.references(() => products.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	variantId: uuid("variant_id").references(() => productVariants.id),
	rating: integer("rating").notNull(),
	title: text("title"),
	body: text("body"),
	status: text("status").notNull().default("pending"),
	moderatedBy: text("moderated_by").references(() => users.id),
	moderatedAt: timestamp("moderated_at"),
	isVerifiedPurchase: boolean("is_verified_purchase").default(false),
		helpfulCount: integer("helpful_count").default(0),
		reportCount: integer("report_count").default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("reviews_workspace_idx").on(table.workspaceId),
	]
);
