import { pgTable, text, boolean, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { workspaces } from "./workspaces"
import { users } from "./users"

// Integration provider types
export const INTEGRATION_PROVIDERS = [
	// ========================================
	// Social Media
	// ========================================
	"twitter",
	"facebook",
	"instagram",
	"linkedin",
	"tiktok",
	"pinterest",
	"threads",
	"youtube",

	// ========================================
	// Communication
	// ========================================
	"slack",
	"discord",
	"teams",
	"telegram",
	"whatsapp",
	"twilio",

	// ========================================
	// Google Suite
	// ========================================
	"google", // OAuth for all Google services
	"gmail",
	"google_sheets",
	"google_docs",
	"google_drive",
	"google_calendar",

	// ========================================
	// Microsoft Suite
	// ========================================
	"microsoft", // OAuth for all Microsoft services
	"outlook",
	"excel",
	"word",
	"onedrive",
	"teams_webhook",

	// ========================================
	// Productivity
	// ========================================
	"notion",
	"airtable",
	"trello",
	"asana",
	"monday",
	"clickup",
	"jira",
	"linear",

	// ========================================
	// GitHub & DevOps
	// ========================================
	"github",
	"gitlab",
	"bitbucket",

	// ========================================
	// Cloud Providers
	// ========================================
	"aws",
	"cloudflare",
	"vercel",
	"netlify",
	"digitalocean",

	// ========================================
	// CRM & Sales
	// ========================================
	"hubspot",
	"salesforce",
	"pipedrive",
	"zendesk",
	"intercom",
	"freshdesk",

	// ========================================
	// E-commerce & Payments
	// ========================================
	"shopify",
	"stripe",
	"paypal",
	"polar",
	"reown",
	"square",

	// ========================================
	// Marketing & Email
	// ========================================
	"resend",
	"mailchimp",
	"klaviyo",
	"sendgrid",
	"mailgun",
	"postmark",

	// ========================================
	// Analytics
	// ========================================
	"segment",
	"mixpanel",
	"posthog",
	"amplitude",
	"google_analytics",

	// ========================================
	// AI Providers
	// ========================================
	"openai",
	"anthropic",
	"cohere",
	"replicate",

	// ========================================
	// Storage
	// ========================================
	"s3",
	"cloudflare_r2",
	"google_cloud_storage",
	"azure_blob",

	// ========================================
	// Other
	// ========================================
	"zapier",
	"make",
	"custom_webhook",
] as const

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

// Authentication types for different providers
export type AuthenticationType = "oauth2" | "api_key" | "webhook" | "basic_auth" | "bearer_token"

/**
 * Workspace integrations table - stores BYOK credentials
 * Encrypted credentials are stored in the `credentials` JSONB field
 */
export const workspaceIntegrations = pgTable(
	"workspace_integrations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// Provider info
		provider: text("provider").$type<IntegrationProvider>().notNull(),
		name: text("name").notNull(), // Display name like "My Slack Workspace"

		// Authentication
		authType: text("auth_type").$type<AuthenticationType>().notNull(),

		// Encrypted credentials (stored as JSONB)
		// Structure depends on authType:
		// - oauth2: { accessToken, refreshToken, expiresAt, scope }
		// - api_key: { apiKey, apiSecret? }
		// - webhook: { webhookUrl, webhookSecret? }
		// - basic_auth: { username, password }
		// - bearer_token: { token }
		credentials: jsonb("credentials").$type<Record<string, unknown>>().notNull(),

		// OAuth-specific metadata
		oauthAccountId: text("oauth_account_id"), // External account ID from OAuth
		oauthEmail: text("oauth_email"), // Email associated with OAuth account

		// Provider-specific metadata
		// e.g., { teamId, channelId, webhookUrl, region, etc. }
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

		// Status
		isActive: boolean("is_active").default(true).notNull(),
		lastUsedAt: timestamp("last_used_at"),
		lastError: text("last_error"),

		// Audit
		createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("workspace_integrations_workspace_idx").on(table.workspaceId),
		index("workspace_integrations_provider_idx").on(table.provider),
		index("workspace_integrations_active_idx").on(table.isActive),
	]
)

/**
 * Integration usage logs - track API calls for rate limiting and billing
 */
export const integrationUsageLogs = pgTable(
	"integration_usage_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		integrationId: uuid("integration_id")
			.notNull()
			.references(() => workspaceIntegrations.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// What was called
		action: text("action").notNull(), // e.g., "send_message", "create_issue"
		endpoint: text("endpoint"), // The API endpoint called

		// Result
		success: boolean("success").notNull(),
		statusCode: text("status_code"),
		errorMessage: text("error_message"),

		// Context
		workflowRunId: uuid("workflow_run_id"), // If triggered by workflow
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

		// Timing
		durationMs: text("duration_ms"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("integration_usage_logs_integration_idx").on(table.integrationId),
		index("integration_usage_logs_workspace_idx").on(table.workspaceId),
		index("integration_usage_logs_created_idx").on(table.createdAt),
	]
)

// Relations
export const workspaceIntegrationsRelations = relations(workspaceIntegrations, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [workspaceIntegrations.workspaceId],
		references: [workspaces.id],
	}),
	createdByUser: one(users, {
		fields: [workspaceIntegrations.createdBy],
		references: [users.id],
	}),
	usageLogs: many(integrationUsageLogs),
}))

export const integrationUsageLogsRelations = relations(integrationUsageLogs, ({ one }) => ({
	integration: one(workspaceIntegrations, {
		fields: [integrationUsageLogs.integrationId],
		references: [workspaceIntegrations.id],
	}),
	workspace: one(workspaces, {
		fields: [integrationUsageLogs.workspaceId],
		references: [workspaces.id],
	}),
}))

// Types
export type WorkspaceIntegration = typeof workspaceIntegrations.$inferSelect
export type NewWorkspaceIntegration = typeof workspaceIntegrations.$inferInsert
export type IntegrationUsageLog = typeof integrationUsageLogs.$inferSelect
export type NewIntegrationUsageLog = typeof integrationUsageLogs.$inferInsert

// Helper type for credentials based on auth type
export interface OAuthCredentials {
	accessToken: string
	refreshToken?: string
	expiresAt?: string
	scope?: string
}

export interface ApiKeyCredentials {
	apiKey: string
	apiSecret?: string
}

export interface WebhookCredentials {
	webhookUrl: string
	webhookSecret?: string
}

export interface BasicAuthCredentials {
	username: string
	password: string
}

export interface BearerTokenCredentials {
	token: string
}
