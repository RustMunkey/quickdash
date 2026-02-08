import { pgTable, text, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { users, sessions } from "./users";
import { workspaces } from "./workspaces";

export const auditLog = pgTable(
	"audit_log",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
	sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
	userName: text("user_name").notNull(),
	userEmail: text("user_email").notNull(),
	action: text("action").notNull(), // e.g. "product.created", "order.updated", "invite.created"
	targetType: text("target_type"), // e.g. "product", "order", "invite", "member"
	targetId: text("target_id"),
	targetLabel: text("target_label"), // human-readable name of the target
		metadata: jsonb("metadata").$type<Record<string, unknown>>(),
		ipAddress: text("ip_address"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("audit_log_workspace_idx").on(table.workspaceId),
	]
);
