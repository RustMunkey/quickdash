import { pgTable, text, boolean, timestamp, jsonb, uuid, index, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { workspaces, storefronts } from "./workspaces"
import { users } from "./users"

// Supported frameworks for auto-detection
export const SUPPORTED_FRAMEWORKS = [
	"nextjs",
	"remix",
	"astro",
	"nuxt",
	"sveltekit",
	"gatsby",
	"vite-react",
	"vite-vue",
	"create-react-app",
	"angular",
	"unknown",
] as const

export type SupportedFramework = (typeof SUPPORTED_FRAMEWORKS)[number]

// Deployment platforms
export const DEPLOYMENT_PLATFORMS = [
	"vercel",
	"netlify",
	"cloudflare",
	"railway",
	"render",
	"fly",
	"aws",
	"self-hosted",
	"unknown",
] as const

export type DeploymentPlatform = (typeof DEPLOYMENT_PLATFORMS)[number]

// Connection status
export type ConnectionStatus = "pending" | "connected" | "disconnected" | "error"

/**
 * Connected Sites - Links GitHub repos to workspaces/storefronts
 * This is the core table for the GitHub integration feature
 */
export const connectedSites = pgTable(
	"connected_sites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// The storefront created for this site
		storefrontId: uuid("storefront_id")
			.references(() => storefronts.id, { onDelete: "set null" }),

		// Site info
		name: text("name").notNull(), // Display name (defaults to repo name)

		// GitHub repo info
		githubRepoId: text("github_repo_id").notNull(), // GitHub's repo ID
		githubRepoFullName: text("github_repo_full_name").notNull(), // owner/repo
		githubRepoUrl: text("github_repo_url").notNull(),
		githubDefaultBranch: text("github_default_branch").default("main"),

		// GitHub account that connected this repo
		githubAccountId: text("github_account_id").notNull(), // GitHub user ID
		githubAccountLogin: text("github_account_login").notNull(), // GitHub username

		// Auto-detected info
		framework: text("framework").$type<SupportedFramework>().default("unknown"),
		frameworkVersion: text("framework_version"),
		deploymentPlatform: text("deployment_platform").$type<DeploymentPlatform>().default("unknown"),

		// Detected config files
		hasPackageJson: boolean("has_package_json").default(false),
		hasEnvExample: boolean("has_env_example").default(false),
		configPaths: jsonb("config_paths").$type<{
			packageJson?: string
			envExample?: string
			envLocal?: string
			nextConfig?: string
			otherConfigs?: string[]
		}>().default({}),

		// Deployment info (if we can detect)
		productionUrl: text("production_url"), // Their live site URL
		vercelProjectId: text("vercel_project_id"),
		netlifyProjectId: text("netlify_project_id"),

		// Connection status
		status: text("status").$type<ConnectionStatus>().default("pending").notNull(),
		lastSyncAt: timestamp("last_sync_at"),
		lastError: text("last_error"),

		// Who connected it
		connectedBy: text("connected_by")
			.notNull()
			.references(() => users.id, { onDelete: "set null" }),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("connected_sites_workspace_idx").on(table.workspaceId),
		index("connected_sites_storefront_idx").on(table.storefrontId),
		index("connected_sites_github_repo_idx").on(table.githubRepoId),
		unique("connected_sites_workspace_repo_unique").on(table.workspaceId, table.githubRepoId),
	]
)

/**
 * GitHub Tokens - Stores OAuth tokens for GitHub repo access
 * Separate from user login tokens - these are for workspace integrations
 */
export const githubTokens = pgTable(
	"github_tokens",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Can be user-level or workspace-level
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id")
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// GitHub account info
		githubAccountId: text("github_account_id").notNull(),
		githubAccountLogin: text("github_account_login").notNull(),
		githubAccountEmail: text("github_account_email"),
		githubAccountAvatar: text("github_account_avatar"),

		// OAuth tokens
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		tokenType: text("token_type").default("bearer"),
		scope: text("scope"), // e.g., "repo,read:user"
		expiresAt: timestamp("expires_at"),

		// Status
		isActive: boolean("is_active").default(true).notNull(),
		lastUsedAt: timestamp("last_used_at"),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("github_tokens_user_idx").on(table.userId),
		index("github_tokens_workspace_idx").on(table.workspaceId),
		unique("github_tokens_user_github_unique").on(table.userId, table.githubAccountId),
	]
)

// Relations
export const connectedSitesRelations = relations(connectedSites, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [connectedSites.workspaceId],
		references: [workspaces.id],
	}),
	storefront: one(storefronts, {
		fields: [connectedSites.storefrontId],
		references: [storefronts.id],
	}),
	connectedByUser: one(users, {
		fields: [connectedSites.connectedBy],
		references: [users.id],
	}),
}))

export const githubTokensRelations = relations(githubTokens, ({ one }) => ({
	user: one(users, {
		fields: [githubTokens.userId],
		references: [users.id],
	}),
	workspace: one(workspaces, {
		fields: [githubTokens.workspaceId],
		references: [workspaces.id],
	}),
}))

// Types
export type ConnectedSite = typeof connectedSites.$inferSelect
export type NewConnectedSite = typeof connectedSites.$inferInsert
export type GithubToken = typeof githubTokens.$inferSelect
export type NewGithubToken = typeof githubTokens.$inferInsert
