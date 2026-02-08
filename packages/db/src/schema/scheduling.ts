import { pgTable, text, uuid, timestamp, integer, boolean, jsonb, index, unique } from "drizzle-orm/pg-core"
import { users } from "./users"
import { workspaces } from "./workspaces"

// Scheduling Events
export const schedulingEvents = pgTable(
	"scheduling_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		createdBy: text("created_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		title: text("title").notNull(),
		description: text("description"),

		// meeting | call | appointment | task | reminder
		type: text("type").notNull().default("meeting"),

		startsAt: timestamp("starts_at").notNull(),
		endsAt: timestamp("ends_at"), // Null for reminders

		isAllDay: boolean("is_all_day").default(false).notNull(),

		location: text("location"), // Physical address or URL

		// Only for type=call
		callType: text("call_type"), // voice | video
		callRoomName: text("call_room_name"), // LiveKit room name, set when call starts

		// iCal RRULE string for recurrence
		rrule: text("rrule"),

		// scheduled | completed | cancelled
		status: text("status").notNull().default("scheduled"),

		// Color label for calendar UI
		color: text("color"),

		// Reminder: how many minutes before event to notify
		reminderMinutes: integer("reminder_minutes").default(15),

		metadata: jsonb("metadata").$type<Record<string, unknown>>(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("scheduling_events_workspace_idx").on(table.workspaceId),
		index("scheduling_events_created_by_idx").on(table.createdBy),
		index("scheduling_events_starts_at_idx").on(table.startsAt),
		index("scheduling_events_type_idx").on(table.type),
	]
)

// Scheduling Attendees
export const schedulingAttendees = pgTable(
	"scheduling_attendees",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		eventId: uuid("event_id")
			.notNull()
			.references(() => schedulingEvents.id, { onDelete: "cascade" }),

		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// pending | accepted | declined | tentative
		status: text("status").notNull().default("pending"),

		reminderSentAt: timestamp("reminder_sent_at"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("scheduling_attendees_event_user_uniq").on(table.eventId, table.userId),
		index("scheduling_attendees_event_idx").on(table.eventId),
		index("scheduling_attendees_user_idx").on(table.userId),
	]
)
