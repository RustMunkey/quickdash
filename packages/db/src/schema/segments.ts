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

export const customerSegments = pgTable(
	"customer_segments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
	description: text("description"),
	type: text("type").notNull().default("manual"),
	rules: jsonb("rules").$type<Array<{ field: string; operator: string; value: string }>>(),
		color: text("color").default("gray"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("customer_segments_workspace_idx").on(table.workspaceId),
	]
);

export const customerSegmentMembers = pgTable("customer_segment_members", {
	id: uuid("id").primaryKey().defaultRandom(),
	segmentId: uuid("segment_id")
		.notNull()
		.references(() => customerSegments.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	addedAt: timestamp("added_at").defaultNow().notNull(),
});
