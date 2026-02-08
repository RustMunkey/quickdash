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

export const faq = pgTable(
	"faq",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		question: text("question").notNull(),
		answer: text("answer").notNull(),
		category: text("category").default("general"),
		sortOrder: integer("sort_order").default(0),
		isActive: boolean("is_active").default(true),
		isFeatured: boolean("is_featured").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("faq_workspace_idx").on(table.workspaceId),
	]
);
