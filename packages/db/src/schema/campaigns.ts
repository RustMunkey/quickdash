import { pgTable, uuid, text, timestamp, integer, decimal, jsonb, index } from "drizzle-orm/pg-core"
import { users } from "./users"
import { workspaces } from "./workspaces"

export const campaigns = pgTable(
	"campaigns",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
	description: text("description"),
	type: text("type").notNull().default("email"), // email | banner | social
	status: text("status").notNull().default("draft"), // draft | scheduled | active | ended | cancelled
	discountCode: text("discount_code"),
	subject: text("subject"),
	content: text("content"),
	audience: text("audience").default("all"), // all | segment | vip
	scheduledAt: timestamp("scheduled_at"),
	startedAt: timestamp("started_at"),
	endedAt: timestamp("ended_at"),
	recipientCount: integer("recipient_count").default(0),
	sentCount: integer("sent_count").default(0),
	openCount: integer("open_count").default(0),
	clickCount: integer("click_count").default(0),
	conversionCount: integer("conversion_count").default(0),
		revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0"),
		createdBy: text("created_by").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("campaigns_workspace_idx").on(table.workspaceId),
	]
)
