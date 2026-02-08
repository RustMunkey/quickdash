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

export const testimonials = pgTable(
	"testimonials",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		reviewerName: text("reviewer_name").notNull(),
		reviewerEmail: text("reviewer_email"),
		rating: integer("rating").notNull(),
		title: text("title"),
		content: text("content").notNull(),
		status: text("status").notNull().default("pending"),
		isFeatured: boolean("is_featured").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("testimonials_workspace_idx").on(table.workspaceId),
	]
);
