import { pgTable, text, uuid, integer, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		parentId: uuid("parent_id"),
		sortOrder: integer("sort_order").default(0),
		image: text("image"),
	},
	(table) => [
		index("categories_workspace_idx").on(table.workspaceId),
	]
);
