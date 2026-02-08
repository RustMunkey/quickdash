import {
	pgTable,
	text,
	uuid,
	decimal,
	integer,
	boolean,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { workspaces } from "./workspaces";

export const shippingCarriers = pgTable(
	"shipping_carriers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		code: text("code").notNull(), // Unique per workspace, not globally
	trackingUrlTemplate: text("tracking_url_template"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shipping_carriers_workspace_idx").on(table.workspaceId),
	]
);

export const shippingRates = pgTable("shipping_rates", {
	id: uuid("id").primaryKey().defaultRandom(),
	carrierId: uuid("carrier_id")
		.notNull()
		.references(() => shippingCarriers.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	minWeight: decimal("min_weight", { precision: 10, scale: 2 }),
	maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
	flatRate: decimal("flat_rate", { precision: 10, scale: 2 }),
	perKgRate: decimal("per_kg_rate", { precision: 10, scale: 2 }),
	estimatedDays: text("estimated_days"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shippingZones = pgTable(
	"shipping_zones",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		countries: jsonb("countries").$type<string[]>().default([]),
		regions: jsonb("regions").$type<string[]>().default([]),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shipping_zones_workspace_idx").on(table.workspaceId),
	]
);

export const shippingZoneRates = pgTable("shipping_zone_rates", {
	id: uuid("id").primaryKey().defaultRandom(),
	zoneId: uuid("zone_id")
		.notNull()
		.references(() => shippingZones.id, { onDelete: "cascade" }),
	carrierId: uuid("carrier_id")
		.notNull()
		.references(() => shippingCarriers.id, { onDelete: "cascade" }),
	rateId: uuid("rate_id")
		.notNull()
		.references(() => shippingRates.id, { onDelete: "cascade" }),
	priceOverride: decimal("price_override", { precision: 10, scale: 2 }),
	isActive: boolean("is_active").default(true).notNull(),
});

export const shippingLabels = pgTable("shipping_labels", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id),
	carrierId: uuid("carrier_id")
		.notNull()
		.references(() => shippingCarriers.id),
	trackingNumber: text("tracking_number").notNull(),
	labelUrl: text("label_url"),
	status: text("status").notNull().default("pending"),
	weight: decimal("weight", { precision: 10, scale: 2 }),
	dimensions: jsonb("dimensions").$type<{ length: number; width: number; height: number }>(),
	cost: decimal("cost", { precision: 10, scale: 2 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shipmentTracking = pgTable("shipment_tracking", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id),
	carrierId: uuid("carrier_id")
		.notNull()
		.references(() => shippingCarriers.id),
	trackingNumber: text("tracking_number").notNull(),
	status: text("status").notNull().default("pending"),
	statusHistory: jsonb("status_history").$type<Array<{ status: string; timestamp: string; location?: string }>>().default([]),
	estimatedDelivery: timestamp("estimated_delivery"),
	// Review queue fields
	reviewStatus: text("review_status").notNull().default("approved"), // approved | pending_review | rejected
	source: text("source").default("manual"), // manual | email | api
	sourceDetails: jsonb("source_details").$type<{ sender?: string; subject?: string; confidence?: string }>(),
	lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trusted senders for auto-approval
export const trustedSenders = pgTable(
	"trusted_senders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		email: text("email").notNull(), // Unique per workspace
		name: text("name"),
		autoApprove: boolean("auto_approve").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("trusted_senders_workspace_idx").on(table.workspaceId),
	]
);
