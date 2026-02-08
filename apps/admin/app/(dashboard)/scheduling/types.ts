export type EventType = "meeting" | "call" | "appointment" | "task" | "reminder"
export type EventStatus = "scheduled" | "completed" | "cancelled"
export type CallType = "voice" | "video"
export type AttendeeStatus = "pending" | "accepted" | "declined" | "tentative"
export type ViewMode = "month" | "week" | "list"
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly"

export type EventAttendee = {
	id: string
	userId: string
	name: string
	image: string | null
	status: AttendeeStatus
}

export type SchedulingEvent = {
	id: string
	title: string
	description: string | null
	type: EventType
	startsAt: string // ISO string
	endsAt: string | null
	isAllDay: boolean
	location: string | null
	callType: CallType | null
	callRoomName: string | null
	rrule: string | null
	status: EventStatus
	color: string | null
	reminderMinutes: number | null
	createdBy: string
	creatorName: string | null
	creatorImage: string | null
	attendees: EventAttendee[]
	createdAt: string
	updatedAt: string
}

export type CreateEventInput = {
	title: string
	description?: string
	type: EventType
	startsAt: string
	endsAt?: string
	isAllDay?: boolean
	location?: string
	callType?: CallType
	rrule?: string
	color?: string
	reminderMinutes?: number
	attendeeIds?: string[]
}

export type UpdateEventInput = Partial<CreateEventInput> & {
	status?: EventStatus
}

export type TeamMember = {
	id: string
	name: string | null
	email: string
	image: string | null
}

export const EVENT_COLORS = [
	{ label: "Blue", value: "blue", class: "bg-blue-500" },
	{ label: "Red", value: "red", class: "bg-red-500" },
	{ label: "Green", value: "green", class: "bg-green-500" },
	{ label: "Yellow", value: "yellow", class: "bg-yellow-500" },
	{ label: "Purple", value: "purple", class: "bg-purple-500" },
	{ label: "Pink", value: "pink", class: "bg-pink-500" },
	{ label: "Orange", value: "orange", class: "bg-orange-500" },
	{ label: "Teal", value: "teal", class: "bg-teal-500" },
] as const

export function getEventColorClass(color: string | null): string {
	const found = EVENT_COLORS.find((c) => c.value === color)
	return found?.class ?? "bg-blue-500"
}
