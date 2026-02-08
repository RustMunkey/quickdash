import {
	pgTable,
	text,
	uuid,
	boolean,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const emailTemplates = pgTable(
	"email_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(), // Unique per workspace, not globally
	subject: text("subject").notNull(),
	body: text("body"),
	variables: jsonb("variables").$type<string[]>().default([]),
		isActive: boolean("is_active").default(true),
		updatedBy: text("updated_by").references(() => users.id),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("email_templates_workspace_idx").on(table.workspaceId),
	]
);

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		templateId: uuid("template_id").references(() => emailTemplates.id),
	recipientId: text("recipient_id").references(() => users.id),
	recipientEmail: text("recipient_email").notNull(),
	subject: text("subject").notNull(),
	body: text("body"),
		status: text("status").notNull().default("sent"),
		sentBy: text("sent_by").references(() => users.id),
		sentAt: timestamp("sent_at").defaultNow().notNull(),
	},
	(table) => [
		index("messages_workspace_idx").on(table.workspaceId),
	]
);
