import {
	pgTable,
	text,
	uuid,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const storeSettings = pgTable(
	"store_settings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		key: text("key").notNull(), // Unique per workspace, not globally
		value: text("value"),
		group: text("group").notNull().default("general"),
		updatedBy: text("updated_by").references(() => users.id),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("store_settings_workspace_idx").on(table.workspaceId),
	]
);
