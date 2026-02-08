"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, and, gte, lte, inArray, desc, sql } from "@quickdash/db/drizzle"
import { schedulingEvents, schedulingAttendees, users, workspaceMembers, notifications } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { logAudit } from "@/lib/audit"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { initiateCall } from "@/app/(dashboard)/calls/actions"
import type {
	SchedulingEvent,
	CreateEventInput,
	UpdateEventInput,
	TeamMember,
	EventAttendee,
} from "./types"

async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")
	return session.user
}

function toEventWithAttendees(
	event: typeof schedulingEvents.$inferSelect & { creatorName: string | null; creatorImage: string | null },
	attendees: EventAttendee[]
): SchedulingEvent {
	return {
		id: event.id,
		title: event.title,
		description: event.description,
		type: event.type as SchedulingEvent["type"],
		startsAt: event.startsAt.toISOString(),
		endsAt: event.endsAt?.toISOString() ?? null,
		isAllDay: event.isAllDay,
		location: event.location,
		callType: event.callType as SchedulingEvent["callType"],
		callRoomName: event.callRoomName,
		rrule: event.rrule,
		status: event.status as SchedulingEvent["status"],
		color: event.color,
		reminderMinutes: event.reminderMinutes,
		createdBy: event.createdBy,
		creatorName: event.creatorName,
		creatorImage: event.creatorImage,
		attendees,
		createdAt: event.createdAt.toISOString(),
		updatedAt: event.updatedAt.toISOString(),
	}
}

async function getAttendeesForEvents(eventIds: string[]): Promise<Record<string, EventAttendee[]>> {
	if (eventIds.length === 0) return {}

	const rows = await db
		.select({
			id: schedulingAttendees.id,
			eventId: schedulingAttendees.eventId,
			userId: schedulingAttendees.userId,
			status: schedulingAttendees.status,
			name: users.name,
			image: users.image,
		})
		.from(schedulingAttendees)
		.innerJoin(users, eq(users.id, schedulingAttendees.userId))
		.where(inArray(schedulingAttendees.eventId, eventIds))

	const map: Record<string, EventAttendee[]> = {}
	for (const row of rows) {
		if (!map[row.eventId]) map[row.eventId] = []
		map[row.eventId].push({
			id: row.id,
			userId: row.userId,
			name: row.name ?? "Unknown",
			image: row.image,
			status: row.status as EventAttendee["status"],
		})
	}
	return map
}

// ─── Queries ──────────────────────────────────────────────────────

export async function getEvents({
	view,
	date,
	type,
}: {
	view: "month" | "week" | "day" | "list"
	date: string // ISO date string
	type?: string
}): Promise<SchedulingEvent[]> {
	const workspace = await requireWorkspace()
	const refDate = new Date(date)

	let rangeStart: Date
	let rangeEnd: Date

	switch (view) {
		case "month": {
			rangeStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
			rangeEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59)
			break
		}
		case "week": {
			const day = refDate.getDay()
			rangeStart = new Date(refDate)
			rangeStart.setDate(refDate.getDate() - day)
			rangeStart.setHours(0, 0, 0, 0)
			rangeEnd = new Date(rangeStart)
			rangeEnd.setDate(rangeStart.getDate() + 6)
			rangeEnd.setHours(23, 59, 59, 999)
			break
		}
		case "day": {
			rangeStart = new Date(refDate)
			rangeStart.setHours(0, 0, 0, 0)
			rangeEnd = new Date(refDate)
			rangeEnd.setHours(23, 59, 59, 999)
			break
		}
		case "list":
		default: {
			// List view: show from start of month to 3 months ahead
			rangeStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
			rangeEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 3, 0, 23, 59, 59)
			break
		}
	}

	const conditions = [
		eq(schedulingEvents.workspaceId, workspace.id),
		gte(schedulingEvents.startsAt, rangeStart),
		lte(schedulingEvents.startsAt, rangeEnd),
	]

	if (type && type !== "all") {
		conditions.push(eq(schedulingEvents.type, type))
	}

	const rows = await db
		.select({
			event: schedulingEvents,
			creatorName: users.name,
			creatorImage: users.image,
		})
		.from(schedulingEvents)
		.innerJoin(users, eq(users.id, schedulingEvents.createdBy))
		.where(and(...conditions))
		.orderBy(schedulingEvents.startsAt)

	const eventIds = rows.map((r) => r.event.id)
	const attendeesMap = await getAttendeesForEvents(eventIds)

	return rows.map((r) =>
		toEventWithAttendees(
			{ ...r.event, creatorName: r.creatorName, creatorImage: r.creatorImage },
			attendeesMap[r.event.id] ?? []
		)
	)
}

export async function getEventById(id: string): Promise<SchedulingEvent | null> {
	const workspace = await requireWorkspace()

	const [row] = await db
		.select({
			event: schedulingEvents,
			creatorName: users.name,
			creatorImage: users.image,
		})
		.from(schedulingEvents)
		.innerJoin(users, eq(users.id, schedulingEvents.createdBy))
		.where(and(eq(schedulingEvents.id, id), eq(schedulingEvents.workspaceId, workspace.id)))
		.limit(1)

	if (!row) return null

	const attendeesMap = await getAttendeesForEvents([id])

	return toEventWithAttendees(
		{ ...row.event, creatorName: row.creatorName, creatorImage: row.creatorImage },
		attendeesMap[id] ?? []
	)
}

// ─── Mutations ────────────────────────────────────────────────────

export async function createEvent(data: CreateEventInput): Promise<SchedulingEvent> {
	const workspace = await requireWorkspace()
	const user = await getCurrentUser()

	const [event] = await db
		.insert(schedulingEvents)
		.values({
			workspaceId: workspace.id,
			createdBy: user.id,
			title: data.title,
			description: data.description ?? null,
			type: data.type,
			startsAt: new Date(data.startsAt),
			endsAt: data.endsAt ? new Date(data.endsAt) : null,
			isAllDay: data.isAllDay ?? false,
			location: data.location ?? null,
			callType: data.type === "call" ? (data.callType ?? "video") : null,
			rrule: data.rrule ?? null,
			color: data.color ?? null,
			reminderMinutes: data.reminderMinutes ?? 15,
		})
		.returning()

	// Add attendees
	const attendeeIds = data.attendeeIds ?? []
	// Always include creator
	const allAttendeeIds = [...new Set([user.id, ...attendeeIds])]

	if (allAttendeeIds.length > 0) {
		await db.insert(schedulingAttendees).values(
			allAttendeeIds.map((userId) => ({
				eventId: event.id,
				userId,
				status: userId === user.id ? "accepted" : "pending",
			}))
		)
	}

	// Non-blocking: audit + Pusher
	logAudit({
		action: "scheduling.event.created",
		targetType: "scheduling_event",
		targetId: event.id,
		targetLabel: data.title,
	}).catch(() => {})

	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "event-created", {
				eventId: event.id,
				title: data.title,
				type: data.type,
				startsAt: data.startsAt,
			})
			.catch(() => {})

		// Notify invited attendees
		for (const uid of attendeeIds) {
			if (uid !== user.id) {
				pusherServer
					.trigger(`private-user-${uid}`, "scheduling-invite", {
						eventId: event.id,
						title: data.title,
						type: data.type,
						startsAt: data.startsAt,
						invitedBy: user.name,
					})
					.catch(() => {})
			}
		}
	}

	const attendeesMap = await getAttendeesForEvents([event.id])
	const [creatorData] = await db
		.select({ name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)

	return toEventWithAttendees(
		{ ...event, creatorName: creatorData?.name ?? null, creatorImage: creatorData?.image ?? null },
		attendeesMap[event.id] ?? []
	)
}

export async function updateEvent(id: string, data: UpdateEventInput): Promise<SchedulingEvent | null> {
	const workspace = await requireWorkspace()

	const updateValues: Record<string, unknown> = { updatedAt: new Date() }
	if (data.title !== undefined) updateValues.title = data.title
	if (data.description !== undefined) updateValues.description = data.description
	if (data.type !== undefined) updateValues.type = data.type
	if (data.startsAt !== undefined) updateValues.startsAt = new Date(data.startsAt)
	if (data.endsAt !== undefined) updateValues.endsAt = new Date(data.endsAt)
	if (data.isAllDay !== undefined) updateValues.isAllDay = data.isAllDay
	if (data.location !== undefined) updateValues.location = data.location
	if (data.callType !== undefined) updateValues.callType = data.callType
	if (data.rrule !== undefined) updateValues.rrule = data.rrule
	if (data.status !== undefined) updateValues.status = data.status
	if (data.color !== undefined) updateValues.color = data.color
	if (data.reminderMinutes !== undefined) updateValues.reminderMinutes = data.reminderMinutes

	await db
		.update(schedulingEvents)
		.set(updateValues)
		.where(and(eq(schedulingEvents.id, id), eq(schedulingEvents.workspaceId, workspace.id)))

	// Re-sync attendees if provided
	if (data.attendeeIds !== undefined) {
		// Remove existing attendees except creator
		const [event] = await db
			.select({ createdBy: schedulingEvents.createdBy })
			.from(schedulingEvents)
			.where(eq(schedulingEvents.id, id))
			.limit(1)

		if (event) {
			await db
				.delete(schedulingAttendees)
				.where(eq(schedulingAttendees.eventId, id))

			const allAttendeeIds = [...new Set([event.createdBy, ...data.attendeeIds])]
			await db.insert(schedulingAttendees).values(
				allAttendeeIds.map((userId) => ({
					eventId: id,
					userId,
					status: userId === event.createdBy ? "accepted" : "pending",
				}))
			)
		}
	}

	// Non-blocking Pusher
	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "event-updated", { eventId: id })
			.catch(() => {})
	}

	logAudit({
		action: "scheduling.event.updated",
		targetType: "scheduling_event",
		targetId: id,
	}).catch(() => {})

	return getEventById(id)
}

export async function deleteEvent(id: string): Promise<void> {
	const workspace = await requireWorkspace()

	await db
		.delete(schedulingEvents)
		.where(and(eq(schedulingEvents.id, id), eq(schedulingEvents.workspaceId, workspace.id)))

	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "event-deleted", { eventId: id })
			.catch(() => {})
	}

	logAudit({
		action: "scheduling.event.deleted",
		targetType: "scheduling_event",
		targetId: id,
	}).catch(() => {})
}

export async function bulkDeleteEvents(ids: string[]): Promise<void> {
	const workspace = await requireWorkspace()

	await db
		.delete(schedulingEvents)
		.where(and(inArray(schedulingEvents.id, ids), eq(schedulingEvents.workspaceId, workspace.id)))

	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "events-deleted", { eventIds: ids })
			.catch(() => {})
	}
}

// ─── RSVP ─────────────────────────────────────────────────────────

export async function respondToEvent(
	eventId: string,
	response: "accepted" | "declined" | "tentative"
): Promise<void> {
	const user = await getCurrentUser()

	await db
		.update(schedulingAttendees)
		.set({ status: response })
		.where(
			and(
				eq(schedulingAttendees.eventId, eventId),
				eq(schedulingAttendees.userId, user.id)
			)
		)

	const workspace = await requireWorkspace()
	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "event-rsvp", {
				eventId,
				userId: user.id,
				response,
			})
			.catch(() => {})
	}
}

// ─── Call Integration ─────────────────────────────────────────────

export async function startScheduledCall(eventId: string): Promise<{
	callId: string
	roomName: string
	token: string
	wsUrl: string
}> {
	const workspace = await requireWorkspace()

	const [event] = await db
		.select()
		.from(schedulingEvents)
		.where(and(eq(schedulingEvents.id, eventId), eq(schedulingEvents.workspaceId, workspace.id)))
		.limit(1)

	if (!event) throw new Error("Event not found")
	if (event.type !== "call") throw new Error("Event is not a call")

	// Get attendee user IDs (excluding creator who initiates)
	const attendees = await db
		.select({ userId: schedulingAttendees.userId })
		.from(schedulingAttendees)
		.where(
			and(
				eq(schedulingAttendees.eventId, eventId),
				sql`${schedulingAttendees.userId} != ${event.createdBy}`
			)
		)

	const participantIds = attendees.map((a) => a.userId)

	// Use existing call infrastructure
	const result = await initiateCall({
		participantIds,
		type: (event.callType as "voice" | "video") || "video",
	})

	// Store room name on the event
	await db
		.update(schedulingEvents)
		.set({ callRoomName: result.roomName, updatedAt: new Date() })
		.where(eq(schedulingEvents.id, eventId))

	if (pusherServer) {
		pusherServer
			.trigger(wsChannel(workspace.id, "scheduling"), "call-started", {
				eventId,
				roomName: result.roomName,
			})
			.catch(() => {})
	}

	return result
}

// ─── Sidebar Queries ──────────────────────────────────────────────

export async function getEventDatesForMonth(
	year: number,
	month: number // 0-indexed
): Promise<string[]> {
	const workspace = await requireWorkspace()
	const start = new Date(year, month, 1)
	const end = new Date(year, month + 1, 0, 23, 59, 59)

	const rows = await db
		.select({ startsAt: schedulingEvents.startsAt })
		.from(schedulingEvents)
		.where(
			and(
				eq(schedulingEvents.workspaceId, workspace.id),
				gte(schedulingEvents.startsAt, start),
				lte(schedulingEvents.startsAt, end)
			)
		)

	// Return unique date strings (YYYY-MM-DD)
	const dates = new Set<string>()
	for (const row of rows) {
		dates.add(row.startsAt.toISOString().split("T")[0])
	}
	return [...dates]
}

export async function getUpcomingEvents(limit = 5): Promise<SchedulingEvent[]> {
	const workspace = await requireWorkspace()
	const now = new Date()

	const rows = await db
		.select({
			event: schedulingEvents,
			creatorName: users.name,
			creatorImage: users.image,
		})
		.from(schedulingEvents)
		.innerJoin(users, eq(users.id, schedulingEvents.createdBy))
		.where(
			and(
				eq(schedulingEvents.workspaceId, workspace.id),
				gte(schedulingEvents.startsAt, now),
				eq(schedulingEvents.status, "scheduled")
			)
		)
		.orderBy(schedulingEvents.startsAt)
		.limit(limit)

	const eventIds = rows.map((r) => r.event.id)
	const attendeesMap = await getAttendeesForEvents(eventIds)

	return rows.map((r) =>
		toEventWithAttendees(
			{ ...r.event, creatorName: r.creatorName, creatorImage: r.creatorImage },
			attendeesMap[r.event.id] ?? []
		)
	)
}

// ─── Team Members ─────────────────────────────────────────────────

export async function getSchedulingTeamMembers(): Promise<TeamMember[]> {
	const workspace = await requireWorkspace()
	return db
		.select({ id: users.id, name: users.name, email: users.email, image: users.image })
		.from(users)
		.innerJoin(workspaceMembers, eq(users.id, workspaceMembers.userId))
		.where(eq(workspaceMembers.workspaceId, workspace.id))
		.orderBy(users.name)
}

// ─── Reminders ────────────────────────────────────────────────────

export async function processSchedulingReminders(): Promise<number> {
	const now = new Date()
	const workspace = await requireWorkspace()

	// Find events where now >= startsAt - reminderMinutes and reminder not yet sent
	const pendingReminders = await db
		.select({
			attendee: schedulingAttendees,
			event: schedulingEvents,
		})
		.from(schedulingAttendees)
		.innerJoin(schedulingEvents, eq(schedulingEvents.id, schedulingAttendees.eventId))
		.where(
			and(
				eq(schedulingEvents.workspaceId, workspace.id),
				eq(schedulingEvents.status, "scheduled"),
				sql`${schedulingAttendees.reminderSentAt} IS NULL`,
				sql`${schedulingEvents.startsAt} - (${schedulingEvents.reminderMinutes} || ' minutes')::interval <= ${now}`
			)
		)

	let count = 0
	for (const { attendee, event } of pendingReminders) {
		// Create notification
		await db.insert(notifications).values({
			userId: attendee.userId,
			workspaceId: workspace.id,
			type: "scheduling",
			title: `Upcoming: ${event.title}`,
			body: `Starting ${event.startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
			link: "/scheduling",
			metadata: { eventId: event.id, eventType: event.type },
		})

		// Mark reminder as sent
		await db
			.update(schedulingAttendees)
			.set({ reminderSentAt: now })
			.where(eq(schedulingAttendees.id, attendee.id))

		// Pusher notification
		if (pusherServer) {
			pusherServer
				.trigger(`private-user-${attendee.userId}`, "scheduling-reminder", {
					eventId: event.id,
					title: event.title,
					startsAt: event.startsAt.toISOString(),
				})
				.catch(() => {})
		}

		count++
	}

	return count
}
