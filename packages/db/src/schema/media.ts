import {
	pgTable,
	text,
	uuid,
	integer,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const mediaItems = pgTable(
	"media_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
	filename: text("filename").notNull(),
	mimeType: text("mime_type"),
	size: integer("size"),
	alt: text("alt"),
		folder: text("folder"),
		uploadedBy: text("uploaded_by").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("media_items_workspace_idx").on(table.workspaceId),
	]
);
