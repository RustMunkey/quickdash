import { pgTable, text, timestamp, boolean, jsonb, date } from "drizzle-orm/pg-core";
import type { SubscriptionTier } from "./workspaces";

// User preferences type for cross-device sync
export type UserPreferences = {
	theme?: "light" | "dark" | "system" | "coffee";
	sidebarOpen?: boolean;
	soundEnabled?: boolean;
	desktopNotifications?: boolean;
};

// User social links type
export type UserSocials = {
	twitter?: string;
	instagram?: string;
	linkedin?: string;
	github?: string;
	youtube?: string;
	tiktok?: string;
};

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	username: text("username").unique(), // @handle - set during onboarding
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false),
	image: text("image"),
	bannerImage: text("banner_image"),
	bannerGradient: text("banner_gradient"), // preset gradient id when no custom image
	bio: text("bio"),
	location: text("location"),
	website: text("website"),
	socials: jsonb("socials").$type<UserSocials>().default({}),
	birthdate: date("birthdate"),
	occupation: text("occupation"),
	role: text("role").default("member"),
	phone: text("phone"),
	discountType: text("discount_type"),
	walletAddress: text("wallet_address"),
	preferences: jsonb("preferences").$type<UserPreferences>().default({}),
	isBetaTester: boolean("is_beta_tester").default(false),
	onboardingCompletedAt: timestamp("onboarding_completed_at"), // null = needs onboarding

	// Subscription (per-user billing)
	subscriptionTier: text("subscription_tier").$type<SubscriptionTier>().default("free").notNull(),
	subscriptionStatus: text("subscription_status").default("active"), // active | past_due | canceled
	polarSubscriptionId: text("polar_subscription_id"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
