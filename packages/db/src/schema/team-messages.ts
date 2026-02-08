import { pgTable, text, uuid, timestamp, json, boolean, index } from "drizzle-orm/pg-core"
import { users } from "./users"
import { incomingWebhookUrls } from "./webhooks"
import { workspaces } from "./workspaces"

export type MessageAttachment = {
	type: "image" | "file" | "video" | "audio"
	url: string
	name: string
	size?: number
	mimeType?: string
}

// Call message data for Snapchat-style call events in chat
export type CallMessageData = {
	callId: string
	callType: "voice" | "video"
	callStatus: "initiated" | "accepted" | "declined" | "missed" | "ended"
	durationSeconds?: number // Only for ended calls
	participantIds: string[] // Other participants in the call
}

// Discord-style embed
export type MessageEmbed = {
	title?: string
	description?: string
	url?: string
	color?: string // Hex color like "#5865F2"
	timestamp?: string // ISO timestamp
	footer?: {
		text: string
		iconUrl?: string
	}
	thumbnail?: {
		url: string
	}
	image?: {
		url: string
	}
	author?: {
		name: string
		url?: string
		iconUrl?: string
	}
	fields?: Array<{
		name: string
		value: string
		inline?: boolean
	}>
}

// Team messages within a workspace channel (NOT DMs)
// DMs are platform-wide and don't have workspaceId
export const teamMessages = pgTable(
	"team_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		// Workspace ID - NULL for DMs (platform-wide), set for channel messages
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		// Either senderId OR webhookId - one must be set
		senderId: text("sender_id")
			.references(() => users.id, { onDelete: "cascade" }),
		webhookId: uuid("webhook_id")
			.references(() => incomingWebhookUrls.id, { onDelete: "set null" }),
		// For webhook messages, allow custom display name/avatar
		webhookUsername: text("webhook_username"),
		webhookAvatarUrl: text("webhook_avatar_url"),
		channel: text("channel").notNull().default("general"), // "dm" for direct messages
		body: text("body"), // Can be null if only embeds
		contentType: text("content_type").notNull().default("text"), // text, markdown, call
		callData: json("call_data").$type<CallMessageData>(), // Only for contentType="call"
		embeds: json("embeds").$type<MessageEmbed[]>().default([]),
		attachments: json("attachments").$type<MessageAttachment[]>().default([]),
		isSystemMessage: boolean("is_system_message").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("team_messages_workspace_idx").on(table.workspaceId),
		index("team_messages_channel_idx").on(table.channel),
		index("team_messages_sender_idx").on(table.senderId),
	]
)

export const teamMessageRecipients = pgTable(
	"team_message_recipients",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => teamMessages.id, { onDelete: "cascade" }),
		recipientId: text("recipient_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		readAt: timestamp("read_at"),
	},
	(table) => [
		index("team_message_recipients_message_idx").on(table.messageId),
		index("team_message_recipients_recipient_idx").on(table.recipientId),
	]
)

// Channels configuration (workspace-scoped)
export const messageChannels = pgTable(
	"message_channels",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(), // e.g., "general", "integrations", "alerts"
		description: text("description"),
		type: text("type").notNull().default("team"), // team, alerts, integrations
		isDefault: boolean("is_default").default(false).notNull(),
		isArchived: boolean("is_archived").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("message_channels_workspace_idx").on(table.workspaceId),
	]
)
