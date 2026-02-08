import {
	pgTable,
	text,
	uuid,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const sitePages = pgTable(
	"site_pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		slug: text("slug").notNull(), // Unique per workspace
	content: text("content"),
	status: text("status").notNull().default("draft"),
		metaTitle: text("meta_title"),
		metaDescription: text("meta_description"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("site_pages_workspace_idx").on(table.workspaceId),
	]
);
