import {
	pgTable,
	text,
	uuid,
	decimal,
	boolean,
	timestamp,
	integer,
	index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const discounts = pgTable(
	"discounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		code: text("code").unique(),
		discountType: text("discount_type"),
		valueType: text("value_type").notNull(),
		value: decimal("value", { precision: 10, scale: 2 }).notNull(),
		minimumOrderAmount: decimal("minimum_order_amount", {
			precision: 10,
			scale: 2,
		}),
		maxUses: integer("max_uses"),
		currentUses: integer("current_uses").default(0),
		maxUsesPerUser: integer("max_uses_per_user").default(1),
		applicableCategories: text("applicable_categories").array(),
		isActive: boolean("is_active").default(true),
		isStackable: boolean("is_stackable").default(false),
		startsAt: timestamp("starts_at"),
		expiresAt: timestamp("expires_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("discounts_workspace_idx").on(table.workspaceId),
	]
);
