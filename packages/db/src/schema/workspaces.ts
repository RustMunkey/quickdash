import {
	pgTable,
	text,
	uuid,
	timestamp,
	boolean,
	jsonb,
	integer,
	bigint,
	unique,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Subscription tier type
export type SubscriptionTier = "hobby" | "lite" | "essentials" | "pro" | "teams" | "beta";

// Workspace features based on tier
export type WorkspaceFeatures = {
	// Commerce
	analytics: boolean;
	reviews: boolean;
	auctions: boolean;
	segments: boolean;
	loyalty: boolean;
	giftCards: boolean;
	subscriptions: boolean;

	// Shipping
	tracking: boolean;
	pendingReview: boolean;
	suppliers: boolean;

	// Marketing
	automation: boolean;
	campaigns: boolean;
	emailTemplates: boolean;
	seo: boolean;

	// Content
	collections: boolean;
	siteContent: boolean;
	mediaLibrary: boolean;

	// CRM
	crm: boolean;
	scheduling: boolean;

	// Communication
	servers: boolean;
	teamChat: boolean;
	inbox: boolean;
	inboundCalling: boolean;
	outboundCalling: boolean;
	callNotifications: boolean;

	// Developer
	integrations: boolean;
	adminApi: boolean;
	webhookEvents: boolean;

	// Settings
	permissions: boolean;
	sessions: boolean;
	exports: boolean;

	// Extras
	widgets: boolean;
	musicLibrary: boolean;

	// Premium
	whiteLabel: boolean;
	customDomain: boolean;
};

// Default features for hobby tier
const HOBBY_FEATURES: WorkspaceFeatures = {
	analytics: false, reviews: false, auctions: false, segments: false,
	loyalty: false, giftCards: false, subscriptions: false,
	tracking: true, pendingReview: false, suppliers: false,
	automation: false, campaigns: false, emailTemplates: false, seo: false,
	collections: true, siteContent: true, mediaLibrary: false,
	crm: false, scheduling: false,
	servers: false, teamChat: false, inbox: false,
	inboundCalling: false, outboundCalling: false, callNotifications: false,
	integrations: false, adminApi: false, webhookEvents: false,
	permissions: false, sessions: false, exports: false,
	widgets: true, musicLibrary: true,
	whiteLabel: false, customDomain: false,
};

const LITE_FEATURES: WorkspaceFeatures = {
	analytics: true, reviews: true, auctions: false, segments: false,
	loyalty: false, giftCards: false, subscriptions: false,
	tracking: true, pendingReview: false, suppliers: false,
	automation: false, campaigns: false, emailTemplates: false, seo: false,
	collections: true, siteContent: true, mediaLibrary: false,
	crm: false, scheduling: false,
	servers: true, teamChat: true, inbox: false,
	inboundCalling: true, outboundCalling: false, callNotifications: false,
	integrations: false, adminApi: false, webhookEvents: false,
	permissions: true, sessions: true, exports: true,
	widgets: true, musicLibrary: true,
	whiteLabel: false, customDomain: false,
};

const ESSENTIALS_FEATURES: WorkspaceFeatures = {
	analytics: true, reviews: true, auctions: true, segments: true,
	loyalty: true, giftCards: true, subscriptions: true,
	tracking: true, pendingReview: true, suppliers: false,
	automation: false, campaigns: false, emailTemplates: true, seo: true,
	collections: true, siteContent: true, mediaLibrary: true,
	crm: false, scheduling: false,
	servers: true, teamChat: true, inbox: true,
	inboundCalling: true, outboundCalling: false, callNotifications: true,
	integrations: true, adminApi: true, webhookEvents: true,
	permissions: true, sessions: true, exports: true,
	widgets: true, musicLibrary: true,
	whiteLabel: false, customDomain: false,
};

const ALL_FEATURES: WorkspaceFeatures = {
	analytics: true, reviews: true, auctions: true, segments: true,
	loyalty: true, giftCards: true, subscriptions: true,
	tracking: true, pendingReview: true, suppliers: true,
	automation: true, campaigns: true, emailTemplates: true, seo: true,
	collections: true, siteContent: true, mediaLibrary: true,
	crm: true, scheduling: true,
	servers: true, teamChat: true, inbox: true,
	inboundCalling: true, outboundCalling: true, callNotifications: true,
	integrations: true, adminApi: true, webhookEvents: true,
	permissions: true, sessions: true, exports: true,
	widgets: true, musicLibrary: true,
	whiteLabel: true, customDomain: true,
};

// Tier display info
export const TIER_INFO: Record<SubscriptionTier, { name: string; price: number; description: string }> = {
	hobby: { name: "Hobby", price: 0, description: "Get started for free" },
	lite: { name: "Lite", price: 20, description: "For small businesses getting serious" },
	essentials: { name: "Essentials", price: 50, description: "Full commerce toolkit for growing businesses" },
	pro: { name: "Pro", price: 100, description: "Everything unlocked for power users" },
	teams: { name: "Teams", price: -1, description: "Custom pricing for large organizations" },
	beta: { name: "Beta", price: 0, description: "Early access — all features unlocked" },
};

// Per-file size limits by category (in bytes)
export const FILE_SIZE_LIMITS: Record<string, number> = {
	image: 10 * 1024 * 1024,      // 10 MB
	video: 100 * 1024 * 1024,     // 100 MB
	audio: 50 * 1024 * 1024,      // 50 MB
	document: 50 * 1024 * 1024,   // 50 MB (PDF, Office, archives, etc.)
};

// Tier limits (storefronts + teamMembers are per-workspace, workspaces is per-user)
export const TIER_LIMITS: Record<SubscriptionTier, {
	workspaces: number;
	storefronts: number;
	teamMembers: number;
	maxWidgets: number;
	maxSongs: number;
	maxStations: number;
	storageBytes: number;
	features: WorkspaceFeatures;
}> = {
	hobby: {
		workspaces: 1, storefronts: 1, teamMembers: 0,
		maxWidgets: 2, maxSongs: 5, maxStations: 1,
		storageBytes: 500 * 1024 * 1024, // 500 MB
		features: HOBBY_FEATURES,
	},
	lite: {
		workspaces: 1, storefronts: 1, teamMembers: 5,
		maxWidgets: 5, maxSongs: 15, maxStations: 3,
		storageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
		features: LITE_FEATURES,
	},
	essentials: {
		workspaces: 1, storefronts: 2, teamMembers: 10,
		maxWidgets: 10, maxSongs: 50, maxStations: 5,
		storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
		features: ESSENTIALS_FEATURES,
	},
	pro: {
		workspaces: 4, storefronts: 5, teamMembers: 50,
		maxWidgets: -1, maxSongs: -1, maxStations: -1,
		storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
		features: ALL_FEATURES,
	},
	teams: {
		workspaces: -1, storefronts: -1, teamMembers: -1,
		maxWidgets: -1, maxSongs: -1, maxStations: -1,
		storageBytes: -1, // unlimited
		features: ALL_FEATURES,
	},
	beta: {
		workspaces: -1, storefronts: -1, teamMembers: -1,
		maxWidgets: -1, maxSongs: -1, maxStations: -1,
		storageBytes: -1, // unlimited — platform owners only
		features: ALL_FEATURES,
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
	maxTeamMembers: integer("max_team_members").default(0),
	maxWidgets: integer("max_widgets").default(2),
	maxSongs: integer("max_songs").default(5),
	maxStations: integer("max_stations").default(1),
	maxStorageBytes: bigint("max_storage_bytes", { mode: "number" }).default(500 * 1024 * 1024), // default 500 MB

	// Features (cached from tier, can be overridden for special cases)
	features: jsonb("features").$type<WorkspaceFeatures>().default(HOBBY_FEATURES),

	// Storage tracking
	storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0).notNull(),

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
