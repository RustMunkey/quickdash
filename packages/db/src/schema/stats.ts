import {
	pgTable,
	text,
	uuid,
	integer,
	boolean,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const stats = pgTable(
	"stats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		value: text("value").notNull(),
		description: text("description"),
		icon: text("icon"),
		sortOrder: integer("sort_order").default(0),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("stats_workspace_idx").on(table.workspaceId),
	]
);
