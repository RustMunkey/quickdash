import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core"
import { users } from "./users"
import { workspaces } from "./workspaces"

// Inbound emails from customers (contact form, replies, etc.)
export const inboxEmails = pgTable(
	"inbox_emails",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		// Sender info
		fromName: text("from_name").notNull(),
	fromEmail: text("from_email").notNull(),
	// Email content
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	bodyHtml: text("body_html"),
	// Source tracking
	source: text("source").notNull().default("contact_form"), // contact_form, email_forward, direct
	sourceId: text("source_id"), // external ID from Resend/forwarding service
	// Status
	status: text("status").notNull().default("unread"), // unread, read, replied, archived, spam
	// Assignment
	assignedTo: text("assigned_to").references(() => users.id),
		// Timestamps
		receivedAt: timestamp("received_at").defaultNow().notNull(),
		readAt: timestamp("read_at"),
		archivedAt: timestamp("archived_at"),
	},
	(table) => [
		index("inbox_emails_workspace_idx").on(table.workspaceId),
	]
)

// Replies sent from admin to customers
export const inboxReplies = pgTable("inbox_replies", {
	id: uuid("id").primaryKey().defaultRandom(),
	emailId: uuid("email_id")
		.notNull()
		.references(() => inboxEmails.id, { onDelete: "cascade" }),
	// Who sent the reply
	senderId: text("sender_id")
		.notNull()
		.references(() => users.id),
	senderName: text("sender_name").notNull(),
	// Reply content
	body: text("body").notNull(),
	bodyHtml: text("body_html"),
	// Resend tracking
	resendId: text("resend_id"), // Resend email ID for tracking
	deliveryStatus: text("delivery_status").default("sent"), // sent, delivered, bounced, opened
	// Timestamps
	sentAt: timestamp("sent_at").defaultNow().notNull(),
})
