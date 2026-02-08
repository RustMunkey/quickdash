import {
	pgTable,
	text,
	uuid,
	decimal,
	timestamp,
	integer,
	index,
	unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const referrals = pgTable(
	"referrals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		referrerId: text("referrer_id")
			.notNull()
			.references(() => users.id),
		referredId: text("referred_id")
			.notNull()
			.references(() => users.id),
		referralCode: text("referral_code").notNull(),
		status: text("status").notNull().default("pending"), // pending | completed | rewarded
		rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }),
		rewardType: text("reward_type"), // credit | discount | free_product
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("referrals_workspace_idx").on(table.workspaceId),
	]
);

export const referralCodes = pgTable(
	"referral_codes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id),
		code: text("code").notNull(), // Unique per workspace
		totalReferrals: integer("total_referrals").default(0),
		totalEarnings: decimal("total_earnings", {
			precision: 10,
			scale: 2,
		}).default("0"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("referral_codes_workspace_user").on(table.workspaceId, table.userId),
		index("referral_codes_workspace_idx").on(table.workspaceId),
	]
);
