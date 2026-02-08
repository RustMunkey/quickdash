import {
	pgTable,
	text,
	uuid,
	timestamp,
	boolean,
	jsonb,
	integer,
	unique,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Subscription tier type
export type SubscriptionTier = "free" | "starter" | "growth" | "pro" | "beta";

// Workspace features based on tier
export type WorkspaceFeatures = {
	api: boolean;
	automation: boolean;
	whiteLabel: boolean;
	customDomain: boolean;
	analytics: boolean;
	integrations: boolean;
};

// Tier limits
export const TIER_LIMITS: Record<SubscriptionTier, { storefronts: number; teamMembers: number; features: WorkspaceFeatures }> = {
	free: {
		storefronts: 1,
		teamMembers: 3,
		features: { api: false, automation: false, whiteLabel: false, customDomain: false, analytics: false, integrations: false },
	},
	starter: {
		storefronts: 2,
		teamMembers: 10,
		features: { api: false, automation: false, whiteLabel: false, customDomain: false, analytics: true, integrations: true },
	},
	growth: {
		storefronts: 5,
		teamMembers: 50,
		features: { api: true, automation: true, whiteLabel: false, customDomain: false, analytics: true, integrations: true },
	},
	pro: {
		storefronts: -1, // unlimited
		teamMembers: -1, // unlimited
		features: { api: true, automation: true, whiteLabel: true, customDomain: true, analytics: true, integrations: true },
	},
	beta: {
		storefronts: -1, // unlimited
		teamMembers: -1, // unlimited
		features: { api: true, automation: true, whiteLabel: true, customDomain: true, analytics: true, integrations: true },
	},
};

// Workspaces - the core multi-tenant unit
export const workspaces = pgTable("workspaces", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),

	// Subscription
	subscriptionTier: text("subscription_tier").$type<SubscriptionTier>().default("free").notNull(),
	subscriptionStatus: text("subscription_status").default("active"), // active | past_due | canceled
	polarSubscriptionId: text("polar_subscription_id"), // Reference to Polar subscription

	// Visibility
	visibility: text("visibility").default("private"), // private | public

	// Branding
	logo: text("logo"),
	banner: text("banner"),
	primaryColor: text("primary_color").default("#000000"),
	description: text("description"),

	// Type of workspace
	workspaceType: text("workspace_type").default("ecommerce"), // ecommerce | community | agency | other

	// Computed limits (cached from tier, can be overridden)
	maxStorefronts: integer("max_storefronts").default(1),
	maxTeamMembers: integer("max_team_members").default(3),

	// Features (cached from tier, can be overridden for special cases)
	features: jsonb("features").$type<WorkspaceFeatures>().default({
		api: false,
		automation: false,
		whiteLabel: false,
		customDomain: false,
		analytics: false,
		integrations: false,
	}),

	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workspace member roles
export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";

// Workspace members - who has access to a workspace
export const workspaceMembers = pgTable(
	"workspace_members",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").$type<WorkspaceMemberRole>().default("member").notNull(),

		// Permissions can override role defaults
		permissions: jsonb("permissions").$type<{
			canManageProducts?: boolean;
			canManageOrders?: boolean;
			canManageCustomers?: boolean;
			canManageSettings?: boolean;
			canManageTeam?: boolean;
			canManageBilling?: boolean;
		}>().default({}),

		// Timestamps
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("workspace_member_unique").on(table.workspaceId, table.userId),
		index("workspace_members_user_idx").on(table.userId),
		index("workspace_members_workspace_idx").on(table.workspaceId),
	]
);

// Workspace invites - pending invitations
export const workspaceInvites = pgTable(
	"workspace_invites",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role").$type<WorkspaceMemberRole>().default("member").notNull(),
		invitedBy: text("invited_by")
			.notNull()
			.references(() => users.id),
		token: text("token").notNull().unique(),
		expiresAt: timestamp("expires_at").notNull(),
		acceptedAt: timestamp("accepted_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("workspace_invites_token_idx").on(table.token),
		index("workspace_invites_email_idx").on(table.email),
	]
);

// Storefronts - connected websites/frontends
export const storefronts = pgTable(
	"storefronts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		domain: text("domain"), // their-store.com
		customDomain: text("custom_domain"), // If they have a custom domain configured

		// API credentials
		apiKey: text("api_key").notNull().unique(), // Public key for frontend
		apiSecret: text("api_secret").notNull(), // Secret for server-side

		// Permissions - what this storefront can access
		permissions: jsonb("permissions").$type<{
			products: boolean;
			orders: boolean;
			customers: boolean;
			checkout: boolean;
			inventory: boolean;
		}>().default({
			products: true,
			orders: true,
			customers: true,
			checkout: true,
			inventory: false,
		}),

		// Status
		isActive: boolean("is_active").default(true),

		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("storefronts_workspace_idx").on(table.workspaceId),
		index("storefronts_api_key_idx").on(table.apiKey),
	]
);

// Friendship status
export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

// Friendships - platform-wide, not workspace-scoped
export const friendships = pgTable(
	"friendships",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		requesterId: text("requester_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		addresseeId: text("addressee_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		status: text("status").$type<FriendshipStatus>().default("pending").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("friendship_unique").on(table.requesterId, table.addresseeId),
		index("friendships_requester_idx").on(table.requesterId),
		index("friendships_addressee_idx").on(table.addresseeId),
	]
);

// User's active workspace preference (which workspace they're currently viewing)
export const userWorkspacePreferences = pgTable(
	"user_workspace_preferences",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" })
			.unique(),
		activeWorkspaceId: uuid("active_workspace_id")
			.references(() => workspaces.id, { onDelete: "set null" }),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	}
);
