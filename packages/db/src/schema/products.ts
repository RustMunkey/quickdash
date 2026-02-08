import {
	pgTable,
	text,
	uuid,
	decimal,
	boolean,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { suppliers } from "./suppliers";
import { workspaces } from "./workspaces";

export const products = pgTable(
	"products",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		shortDescription: text("short_description"),

		// Pricing
		price: decimal("price", { precision: 10, scale: 2 }).notNull(),
		compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
		salePrice: decimal("sale_price", { precision: 10, scale: 2 }), // Active sale price
		saleStartsAt: timestamp("sale_starts_at"), // When sale begins (null = immediately)
		saleEndsAt: timestamp("sale_ends_at"), // When sale ends (null = indefinitely)
		costPrice: decimal("cost_price", { precision: 10, scale: 2 }),

		// Source and fulfillment
		sourceType: text("source_type").notNull().default("owned"),
		supplierId: uuid("supplier_id").references(() => suppliers.id),

		// Organization
		categoryId: uuid("category_id").references(() => categories.id),
		tags: jsonb("tags").$type<string[]>().default([]),

		// Media
		images: jsonb("images").$type<string[]>().default([]),
		thumbnail: text("thumbnail"),

		// Status
		isActive: boolean("is_active").default(true),
		isSubscribable: boolean("is_subscribable").default(false),
		isFeatured: boolean("is_featured").default(false),

		// Physical attributes
		weight: decimal("weight", { precision: 8, scale: 2 }),
		weightUnit: text("weight_unit").default("oz"),

		// SEO
		metaTitle: text("meta_title"),
		metaDescription: text("meta_description"),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("products_workspace_idx").on(table.workspaceId),
	]
);

export const productVariants = pgTable("product_variants", {
	id: uuid("id").primaryKey().defaultRandom(),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	sku: text("sku").notNull().unique(),
	price: decimal("price", { precision: 10, scale: 2 }),
	attributes: jsonb("attributes").$type<Record<string, string>>().default({}),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
