import { pgTable, text, boolean, timestamp, jsonb, uuid, unique, integer, index } from "drizzle-orm/pg-core"
import { workspaces } from "./workspaces"

// Webhook Endpoints - stores registered webhook sources (incoming)
export const webhookEndpoints = pgTable("webhook_endpoints", {
	id: uuid("id").primaryKey().defaultRandom(),
	provider: text("provider").notNull(), // polar, easypost, resend, supplier, shipping
	name: text("name").notNull(),
	secretKey: text("secret_key"), // for signature verification
	isActive: boolean("is_active").default(true).notNull(),
	lastReceivedAt: timestamp("last_received_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Webhook Events Log - stores all incoming webhooks for debugging/replay
export const webhookEvents = pgTable("webhook_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	provider: text("provider").notNull(), // polar, easypost, resend, supplier, shipping, messaging
	eventType: text("event_type").notNull(), // e.g., payment_intent.succeeded
	externalId: text("external_id"), // provider's event ID for deduplication
	payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
	headers: jsonb("headers").$type<Record<string, string>>(),
	status: text("status").notNull().default("pending"), // pending, processing, processed, failed
	processedAt: timestamp("processed_at"),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Idempotency Keys - prevent duplicate webhook processing
export const webhookIdempotency = pgTable("webhook_idempotency", {
	id: uuid("id").primaryKey().defaultRandom(),
	provider: text("provider").notNull(),
	eventId: text("event_id").notNull(),
	processedAt: timestamp("processed_at").defaultNow().notNull(),
}, (table) => [
	unique("webhook_idempotency_provider_event").on(table.provider, table.eventId),
])

// ==============================================
// OUTGOING WEBHOOKS - Fire events TO external systems
// ==============================================

// Outgoing Webhook Endpoints - user-configured destinations
export const outgoingWebhookEndpoints = pgTable(
	"outgoing_webhook_endpoints",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		url: text("url").notNull(), // The endpoint URL to POST to
		secret: text("secret").notNull(), // For HMAC signature
		events: jsonb("events").$type<string[]>().default([]).notNull(), // Events to subscribe to
		headers: jsonb("headers").$type<Record<string, string>>().default({}), // Custom headers to include
		isActive: boolean("is_active").default(true).notNull(),
		lastDeliveryAt: timestamp("last_delivery_at"),
		lastDeliveryStatus: text("last_delivery_status"), // success, failed
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("outgoing_webhook_endpoints_workspace_idx").on(table.workspaceId),
	]
)

// Outgoing Webhook Deliveries - log of all delivery attempts
export const outgoingWebhookDeliveries = pgTable("outgoing_webhook_deliveries", {
	id: uuid("id").primaryKey().defaultRandom(),
	endpointId: uuid("endpoint_id")
		.notNull()
		.references(() => outgoingWebhookEndpoints.id, { onDelete: "cascade" }),
	event: text("event").notNull(), // e.g., order.created
	payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
	status: text("status").notNull().default("pending"), // pending, success, failed
	responseCode: integer("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	attempts: integer("attempts").default(0).notNull(),
	nextRetryAt: timestamp("next_retry_at"),
	deliveredAt: timestamp("delivered_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ==============================================
// INCOMING WEBHOOK URLs - Discord/Slack-style messaging webhooks
// ==============================================

// Incoming Webhook URLs for messaging - generate URLs that accept messages
export const incomingWebhookUrls = pgTable(
	"incoming_webhook_urls",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(), // e.g., "GitHub Notifications", "Deploy Alerts"
		token: text("token").notNull().unique(), // The unique token in the URL
		channel: text("channel").notNull().default("integrations"), // Which channel to post to
		allowedSources: jsonb("allowed_sources").$type<string[]>().default([]), // Optional IP/domain allowlist
		defaultUsername: text("default_username"), // Override username if not provided
		defaultAvatarUrl: text("default_avatar_url"), // Override avatar if not provided
		isActive: boolean("is_active").default(true).notNull(),
		lastUsedAt: timestamp("last_used_at"),
		messageCount: integer("message_count").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("incoming_webhook_urls_workspace_idx").on(table.workspaceId),
	]
)
