import {
	pgTable,
	text,
	uuid,
	integer,
	boolean,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const alertRules = pgTable(
	"alert_rules",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
	type: text("type").notNull(),
	channel: text("channel").notNull().default("email"),
	threshold: integer("threshold"),
		isActive: boolean("is_active").default(true),
		recipients: jsonb("recipients").$type<string[]>().default([]),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("alert_rules_workspace_idx").on(table.workspaceId),
	]
);
