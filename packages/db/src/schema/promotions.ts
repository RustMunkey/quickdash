import { pgTable, text, uuid, timestamp, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

// Promotional offer claims — tracks who has claimed intro offers
// Device fingerprint prevents abuse (same device creating new emails)
export const promotionalClaims = pgTable(
	"promotional_claims",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// Which promo was claimed
		promoCode: text("promo_code").notNull(), // e.g. "intro_pro_3mo"

		// Device fingerprint (canvas hash + webgl + screen + timezone composite)
		deviceFingerprint: text("device_fingerprint").notNull(),

		// Promo details
		tier: text("tier").notNull(), // the tier granted
		durationMonths: integer("duration_months").notNull(), // how long the promo lasts
		pricePerMonth: integer("price_per_month").notNull(), // in cents

		// Status tracking
		startsAt: timestamp("starts_at").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		isActive: boolean("is_active").default(true).notNull(),

		// Polar reference
		polarSubscriptionId: text("polar_subscription_id"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("promo_claims_user_idx").on(table.userId),
		index("promo_claims_fingerprint_idx").on(table.deviceFingerprint),
		index("promo_claims_promo_code_idx").on(table.promoCode),
	]
);

// Usage metering — tracks consumption-based usage
export const usageRecords = pgTable(
	"usage_records",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id").notNull(),

		// What was used
		metric: text("metric").notNull(), // "workflow_runs" | "api_calls" | "automations"

		// Usage count for this record
		quantity: integer("quantity").notNull().default(1),

		// Period tracking (usage persists, not monthly reset)
		recordedAt: timestamp("recorded_at").defaultNow().notNull(),

		// Optional metadata (workflow id, endpoint, etc.)
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
	},
	(table) => [
		index("usage_records_user_idx").on(table.userId),
		index("usage_records_workspace_idx").on(table.workspaceId),
		index("usage_records_metric_idx").on(table.metric),
		index("usage_records_recorded_at_idx").on(table.recordedAt),
	]
);
