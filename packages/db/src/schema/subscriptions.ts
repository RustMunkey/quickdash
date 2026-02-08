import {
	pgTable,
	text,
	uuid,
	decimal,
	timestamp,
	integer,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { productVariants } from "./products";
import { addresses } from "./addresses";
import { workspaces } from "./workspaces";

export const subscriptions = pgTable(
	"subscriptions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		status: text("status").notNull().default("active"),
		frequency: text("frequency").notNull(),
		shippingAddressId: uuid("shipping_address_id").references(
			() => addresses.id,
		),
		pricePerDelivery: decimal("price_per_delivery", {
			precision: 10,
			scale: 2,
		}).notNull(),
		nextDeliveryAt: timestamp("next_delivery_at"),
		lastDeliveryAt: timestamp("last_delivery_at"),
		totalDeliveries: integer("total_deliveries").default(0),
		cancelledAt: timestamp("cancelled_at"),
		cancellationReason: text("cancellation_reason"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("subscriptions_workspace_idx").on(table.workspaceId),
		index("subscriptions_user_idx").on(table.userId),
		index("subscriptions_status_idx").on(table.status),
	]
);

export const subscriptionItems = pgTable("subscription_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	subscriptionId: uuid("subscription_id")
		.notNull()
		.references(() => subscriptions.id, { onDelete: "cascade" }),
	variantId: uuid("variant_id")
		.notNull()
		.references(() => productVariants.id),
	quantity: integer("quantity").notNull().default(1),
});
