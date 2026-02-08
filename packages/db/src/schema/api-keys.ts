import { pgTable, text, boolean, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { workspaces } from "./workspaces"
import { users } from "./users"

/**
 * Admin API Keys - Secret keys for programmatic access to workspace data
 *
 * These are different from Storefront API keys:
 * - Storefront keys: Limited public API for customer-facing operations
 * - Admin API keys: Full access for server-to-server integrations
 */

// API Key permissions - what operations the key can perform
export type ApiKeyPermissions = {
	// Read permissions
	readProducts?: boolean
	readOrders?: boolean
	readCustomers?: boolean
	readInventory?: boolean
	readWebhooks?: boolean
	readAnalytics?: boolean
	readContent?: boolean
	readMarketing?: boolean
	readReviews?: boolean
	readShipping?: boolean
	readSubscriptions?: boolean
	readAuctions?: boolean

	// Write permissions
	writeProducts?: boolean
	writeOrders?: boolean
	writeCustomers?: boolean
	writeInventory?: boolean
	writeWebhooks?: boolean
	writeContent?: boolean
	writeMarketing?: boolean
	writeReviews?: boolean
	writeShipping?: boolean
	writeSubscriptions?: boolean
	writeAuctions?: boolean

	// Full access (overrides individual permissions)
	fullAccess?: boolean
}

// Default permissions for new API keys
export const DEFAULT_API_KEY_PERMISSIONS: ApiKeyPermissions = {
	readProducts: true,
	readOrders: true,
	readCustomers: true,
	readInventory: true,
	readWebhooks: true,
	readAnalytics: true,
	readContent: true,
	readMarketing: true,
	readReviews: true,
	readShipping: true,
	readSubscriptions: true,
	readAuctions: true,
	writeProducts: false,
	writeOrders: false,
	writeCustomers: false,
	writeInventory: false,
	writeWebhooks: false,
	writeContent: false,
	writeMarketing: false,
	writeReviews: false,
	writeShipping: false,
	writeSubscriptions: false,
	writeAuctions: false,
	fullAccess: false,
}

export const adminApiKeys = pgTable(
	"admin_api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// Key identification
		name: text("name").notNull(), // Human-readable name, e.g., "Production Server"
		description: text("description"), // Optional description

		// The actual secret key (hashed for storage, prefix shown to user)
		// Format: sk_live_xxxxx (live) or sk_test_xxxxx (test mode)
		keyPrefix: text("key_prefix").notNull(), // First 8 chars of the key for identification
		keyHash: text("key_hash").notNull(), // SHA-256 hash of the full key

		// Permissions
		permissions: jsonb("permissions").$type<ApiKeyPermissions>().default(DEFAULT_API_KEY_PERMISSIONS).notNull(),

		// Environment
		environment: text("environment").$type<"live" | "test">().default("live").notNull(),

		// Rate limiting
		rateLimit: text("rate_limit").default("1000/hour"), // Format: "count/period"

		// IP restrictions (optional)
		allowedIps: jsonb("allowed_ips").$type<string[]>().default([]),

		// Status
		isActive: boolean("is_active").default(true).notNull(),

		// Usage tracking
		lastUsedAt: timestamp("last_used_at"),
		usageCount: text("usage_count").default("0"), // Using text to avoid bigint issues

		// Who created this key
		createdBy: text("created_by")
			.notNull()
			.references(() => users.id, { onDelete: "set null" }),

		// Expiration (optional)
		expiresAt: timestamp("expires_at"),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("admin_api_keys_workspace_idx").on(table.workspaceId),
		index("admin_api_keys_key_prefix_idx").on(table.keyPrefix),
		index("admin_api_keys_key_hash_idx").on(table.keyHash),
	]
)

// Relations
export const adminApiKeysRelations = relations(adminApiKeys, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [adminApiKeys.workspaceId],
		references: [workspaces.id],
	}),
	createdByUser: one(users, {
		fields: [adminApiKeys.createdBy],
		references: [users.id],
	}),
}))

// Types
export type AdminApiKey = typeof adminApiKeys.$inferSelect
export type NewAdminApiKey = typeof adminApiKeys.$inferInsert
