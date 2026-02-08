import {
	pgTable,
	text,
	uuid,
	decimal,
	integer,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { productVariants } from "./products";
import { workspaces } from "./workspaces";

export const suppliers = pgTable(
	"suppliers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	website: text("website"),
	country: text("country"),
	apiEndpoint: text("api_endpoint"),
	apiCredentials: jsonb("api_credentials").$type<Record<string, string>>(),
	averageLeadTimeDays: text("average_lead_time_days"),
	shippingMethods: jsonb("shipping_methods").$type<string[]>().default([]),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("suppliers_workspace_idx").on(table.workspaceId),
	]
);

export const purchaseOrders = pgTable(
	"purchase_orders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		poNumber: text("po_number").notNull().unique(),
	supplierId: uuid("supplier_id")
		.notNull()
		.references(() => suppliers.id),
	status: text("status").notNull().default("draft"),
	subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
	shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
	total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
	expectedDelivery: timestamp("expected_delivery"),
	receivedAt: timestamp("received_at"),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("purchase_orders_workspace_idx").on(table.workspaceId),
	]
);

export const purchaseOrderItems = pgTable("purchase_order_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	purchaseOrderId: uuid("purchase_order_id")
		.notNull()
		.references(() => purchaseOrders.id, { onDelete: "cascade" }),
	variantId: uuid("variant_id")
		.notNull()
		.references(() => productVariants.id),
	quantity: integer("quantity").notNull(),
	unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
	totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
	receivedQuantity: integer("received_quantity").default(0),
});
