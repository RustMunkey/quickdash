import {
	pgTable,
	text,
	uuid,
	timestamp,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const blogPosts = pgTable(
	"blog_posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		slug: text("slug").notNull(), // Unique per workspace, not globally
	excerpt: text("excerpt"),
	content: text("content"),
	coverImage: text("cover_image"),
	author: text("author").references(() => users.id),
	status: text("status").notNull().default("draft"),
	publishedAt: timestamp("published_at"),
	metaTitle: text("meta_title"),
	metaDescription: text("meta_description"),
		tags: jsonb("tags").$type<string[]>().default([]),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("blog_posts_workspace_idx").on(table.workspaceId),
	]
);
