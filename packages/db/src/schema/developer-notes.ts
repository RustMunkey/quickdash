import {
	pgTable,
	text,
	uuid,
	timestamp,
	index,
	boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const developerNotes = pgTable(
	"developer_notes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		body: text("body").notNull(),
		type: text("type").notNull().default("bug"), // bug, feature, issue, note, working, broken
		status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
		priority: text("priority").notNull().default("medium"), // low, medium, high, critical
		isGlobal: boolean("is_global").default(true).notNull(), // If true, visible to all users platform-wide
		authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
		assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
		resolvedAt: timestamp("resolved_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("developer_notes_workspace_idx").on(table.workspaceId),
		index("developer_notes_global_idx").on(table.isGlobal),
	]
);
