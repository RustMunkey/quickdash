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
import { users } from "./users";
import { productVariants } from "./products";
import { addresses } from "./addresses";
import { workspaces } from "./workspaces";

export const orders = pgTable(
	"orders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		orderNumber: text("order_number").notNull().unique(),
		userId: text("user_id")
			.references(() => users.id),
		status: text("status").notNull().default("pending"),
		subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
		discountAmount: decimal("discount_amount", {
			precision: 10,
			scale: 2,
		}).default("0"),
		taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
		shippingAmount: decimal("shipping_amount", {
			precision: 10,
			scale: 2,
		}).default("0"),
		total: decimal("total", { precision: 10, scale: 2 }).notNull(),
		shippingAddressId: uuid("shipping_address_id").references(
			() => addresses.id,
		),
		billingAddressId: uuid("billing_address_id").references(() => addresses.id),
		trackingNumber: text("tracking_number"),
		trackingUrl: text("tracking_url"),
		shippedAt: timestamp("shipped_at"),
		deliveredAt: timestamp("delivered_at"),
		customerNotes: text("customer_notes"),
		internalNotes: text("internal_notes"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("orders_workspace_idx").on(table.workspaceId),
		index("orders_user_idx").on(table.userId),
		index("orders_status_idx").on(table.status),
	]
);

export const orderItems = pgTable("order_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id, { onDelete: "cascade" }),
	variantId: uuid("variant_id")
		.references(() => productVariants.id),
	productName: text("product_name").notNull(),
	variantName: text("variant_name"),
	sku: text("sku"),
	unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
	quantity: integer("quantity").notNull(),
	totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderNotes = pgTable("order_notes", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	createdBy: text("created_by").references(() => users.id),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
