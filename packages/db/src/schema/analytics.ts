import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const analyticsEvents = pgTable(
	"analytics_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		sessionId: text("session_id").notNull(),
	visitorId: text("visitor_id").notNull(),
	eventType: text("event_type").notNull().default("pageview"),
	pathname: text("pathname").notNull(),
	referrer: text("referrer"),
		hostname: text("hostname"),
		eventData: jsonb("event_data").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("analytics_events_workspace_idx").on(table.workspaceId),
	]
);
