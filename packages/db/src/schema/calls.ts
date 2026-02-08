import { pgTable, text, uuid, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core"
import { users } from "./users"

// Main calls table - stores call history and metadata
export const calls = pgTable("calls", {
	id: uuid("id").primaryKey().defaultRandom(),

	// LiveKit room name (unique per call)
	roomName: text("room_name").notNull().unique(),

	// Call initiator
	initiatorId: text("initiator_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),

	// Call type: 'voice' | 'video'
	type: text("type").notNull().default("video"),

	// Call status: 'ringing' | 'connected' | 'ended' | 'missed' | 'declined' | 'failed'
	status: text("status").notNull().default("ringing"),

	// Group call flag
	isGroup: boolean("is_group").default(false),

	// Optional: associated chat channel for context
	chatChannel: text("chat_channel"),

	// Timestamps
	startedAt: timestamp("started_at"),
	endedAt: timestamp("ended_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),

	// End reason: 'completed' | 'missed' | 'declined' | 'error' | 'timeout'
	endReason: text("end_reason"),

	// Duration in seconds (computed when call ends)
	durationSeconds: integer("duration_seconds"),

	// Metadata for extensibility
	metadata: jsonb("metadata").$type<{
		screenShareUsed?: boolean
		recordingUrl?: string
		maxParticipants?: number
	}>().default({}),
})

// Call participants - who was invited and their participation status
export const callParticipants = pgTable("call_participants", {
	id: uuid("id").primaryKey().defaultRandom(),

	callId: uuid("call_id")
		.notNull()
		.references(() => calls.id, { onDelete: "cascade" }),

	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),

	// Participant status: 'invited' | 'ringing' | 'joined' | 'left' | 'declined' | 'missed'
	status: text("status").notNull().default("invited"),

	// Role: 'initiator' | 'participant'
	role: text("role").notNull().default("participant"),

	// Timestamps
	invitedAt: timestamp("invited_at").defaultNow().notNull(),
	joinedAt: timestamp("joined_at"),
	leftAt: timestamp("left_at"),

	// Track media state for analytics
	hadVideo: boolean("had_video").default(false),
	hadAudio: boolean("had_audio").default(true),
	sharedScreen: boolean("shared_screen").default(false),
})
