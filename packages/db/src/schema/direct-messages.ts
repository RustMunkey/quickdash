import { pgTable, text, uuid, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core"
import { users } from "./users"

// Direct message attachment type
export type DMAttachment = {
	type: "image" | "file" | "link"
	url: string
	name?: string
	size?: number
	mimeType?: string
}

// Direct message conversations (between two users)
export const dmConversations = pgTable(
	"dm_conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		// Store both user IDs - participant1 is always the lower ID alphabetically for consistency
		participant1Id: text("participant1_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		participant2Id: text("participant2_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		lastMessageAt: timestamp("last_message_at"),
		lastMessagePreview: text("last_message_preview"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("dm_conv_participant1_idx").on(table.participant1Id),
		index("dm_conv_participant2_idx").on(table.participant2Id),
	]
)

// Direct messages
export const directMessages = pgTable(
	"direct_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => dmConversations.id, { onDelete: "cascade" }),
		senderId: text("sender_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		attachments: jsonb("attachments").$type<DMAttachment[]>().default([]),
		isEdited: boolean("is_edited").default(false),
		readAt: timestamp("read_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("dm_conversation_idx").on(table.conversationId),
		index("dm_sender_idx").on(table.senderId),
		index("dm_created_idx").on(table.createdAt),
	]
)
