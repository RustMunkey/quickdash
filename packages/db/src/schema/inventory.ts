import { pgTable, uuid, integer, timestamp, text, index } from "drizzle-orm/pg-core";
import { productVariants } from "./products";
import { workspaces } from "./workspaces";

export const inventory = pgTable("inventory", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
	variantId: uuid("variant_id")
		.notNull()
		.references(() => productVariants.id, { onDelete: "cascade" })
		.unique(),
	quantity: integer("quantity").notNull().default(0),
	reservedQuantity: integer("reserved_quantity").notNull().default(0),
	lowStockThreshold: integer("low_stock_threshold").default(10),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
	index("inventory_workspace_idx").on(table.workspaceId),
]);

export const inventoryLogs = pgTable("inventory_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
	variantId: uuid("variant_id")
		.notNull()
		.references(() => productVariants.id),
	previousQuantity: integer("previous_quantity").notNull(),
	newQuantity: integer("new_quantity").notNull(),
	reason: text("reason").notNull(),
	orderId: uuid("order_id"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
	index("inventory_logs_workspace_idx").on(table.workspaceId),
]);
