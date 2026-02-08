import {
	pgTable,
	text,
	uuid,
	integer,
	boolean,
	timestamp,
	jsonb,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./users";

// --- Types for the schema JSONB ---

export type FieldType =
	| "text"
	| "textarea"
	| "number"
	| "boolean"
	| "select"
	| "image"
	| "url"
	| "email"
	| "date"
	| "rating"
	| "color";

export type CollectionField = {
	key: string;
	label: string;
	type: FieldType;
	required?: boolean;
	placeholder?: string;
	defaultValue?: unknown;
	options?: { label: string; value: string }[];
};

export type CollectionSchema = {
	fields: CollectionField[];
	settings: {
		titleField: string;
		descriptionField?: string;
		imageField?: string;
		defaultSort?: string;
		defaultSortDir?: "asc" | "desc";
	};
};

// --- Tables ---

export const contentCollections = pgTable(
	"content_collections",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		description: text("description"),
		icon: text("icon"),
		schema: jsonb("schema").$type<CollectionSchema>().notNull(),
		allowPublicSubmit: boolean("allow_public_submit").default(false),
		publicSubmitStatus: text("public_submit_status").default("inactive"),
		isActive: boolean("is_active").default(true),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("content_collections_workspace_idx").on(table.workspaceId),
		uniqueIndex("content_collections_workspace_slug_idx").on(
			table.workspaceId,
			table.slug
		),
	]
);

export const contentEntries = pgTable(
	"content_entries",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		collectionId: uuid("collection_id")
			.notNull()
			.references(() => contentCollections.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
		isActive: boolean("is_active").default(true),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		updatedBy: text("updated_by").references(() => users.id),
	},
	(table) => [
		index("content_entries_collection_idx").on(table.collectionId),
		index("content_entries_workspace_idx").on(table.workspaceId),
	]
);
