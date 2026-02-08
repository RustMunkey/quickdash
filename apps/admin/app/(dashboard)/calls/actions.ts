"use server"

import { headers } from "next/headers"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { eq, and, desc, inArray, or } from "@quickdash/db/drizzle"
import { calls, callParticipants, users, teamMessages, teamMessageRecipients, directMessages, dmConversations } from "@quickdash/db/schema"
import type { CallMessageData } from "@quickdash/db/schema"
import { pusherServer } from "@/lib/pusher-server"
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured, listRoomParticipants, listActiveRooms } from "@/lib/livekit-server"
import type {
	CallType,
	CallWithParticipants,
	CallHistoryItem,
	IncomingCallEvent,
	CallAcceptedEvent,
	CallDeclinedEvent,
	CallEndedEvent,
	ParticipantJoinedEvent,
} from "./types"

async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")
	return session.user
}

// Helper to create a call message in the chat (Snapchat-style)
async function createCallMessage(data: {
	senderId: string
	recipientIds: string[]
	callId: string
	callType: CallType
	callStatus: "initiated" | "accepted" | "declined" | "missed" | "ended"
	durationSeconds?: number
}) {
	const { senderId, recipientIds, callId, callType, callStatus, durationSeconds } = data

	// Create the call message
	const callData: CallMessageData = {
		callId,
		callType,
		callStatus,
		durationSeconds,
		participantIds: recipientIds,
	}

	// Determine the body text based on status
	let body: string
	switch (callStatus) {
		case "initiated":
			body = callType === "video" ? "Started a video call" : "Started a voice call"
			break
		case "accepted":
			body = callType === "video" ? "Video call in progress" : "Voice call in progress"
			break
		case "declined":
			body = "Call declined"
			break
		case "missed":
			body = callType === "video" ? "Missed video call" : "Missed voice call"
			break
		case "ended":
			if (durationSeconds && durationSeconds > 0) {
				const mins = Math.floor(durationSeconds / 60)
				const secs = durationSeconds % 60
				const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
				body = callType === "video" ? `Video call · ${durationStr}` : `Voice call · ${durationStr}`
			} else {
				body = callType === "video" ? "Video call ended" : "Voice call ended"
			}
			break
		default:
			body = "Call"
	}

	const [message] = await db
		.insert(teamMessages)
		.values({
			senderId,
			channel: "dm", // Call messages go in DM channel
			body,
			contentType: "call",
			callData,
			isSystemMessage: true,
		})
		.returning()

	// Add recipients
	if (recipientIds.length > 0) {
		await db.insert(teamMessageRecipients).values(
			recipientIds.map((recipientId) => ({
				messageId: message.id,
				recipientId,
			}))
		)
	}

	// Also insert into directMessages so call events appear in friends tab DMs
	for (const recipientId of recipientIds) {
		try {
			// Find existing DM conversation (participant order is alphabetical)
			const [p1, p2] = [senderId, recipientId].sort()
			const [conv] = await db
				.select()
				.from(dmConversations)
				.where(
					and(
						eq(dmConversations.participant1Id, p1),
						eq(dmConversations.participant2Id, p2)
					)
				)
				.limit(1)

			if (conv) {
				await db.insert(directMessages).values({
					conversationId: conv.id,
					senderId,
					body,
				})
				// Update conversation preview
				await db
					.update(dmConversations)
					.set({ lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 100) })
					.where(eq(dmConversations.id, conv.id))

				// Notify recipient via Pusher so it appears in real-time
				if (pusherServer) {
					const [sender] = await db
						.select({ name: users.name, image: users.image })
						.from(users)
						.where(eq(users.id, senderId))
						.limit(1)

					pusherServer.trigger(`private-user-${recipientId}`, "dm-received", {
						conversationId: conv.id,
						message: {
							id: `call-${callId}-${recipientId}`,
							senderId,
							senderName: sender?.name || "Unknown",
							senderImage: sender?.image || null,
							body,
							attachments: [],
							createdAt: new Date().toISOString(),
						},
					}).catch(console.error)
				}
			}
		} catch (err) {
			console.error("[Call] Failed to insert call message into DMs:", err)
		}
	}

	return message
}

export async function initiateCall(data: {
	participantIds: string[]
	type: CallType
	chatChannel?: string
}): Promise<{ callId: string; roomName: string; token: string; wsUrl: string }> {
	if (!isLiveKitConfigured()) {
		throw new Error("Calling is not configured")
	}

	const user = await getCurrentUser()
	const { participantIds, type, chatChannel } = data

	if (participantIds.length === 0) {
		throw new Error("At least one participant is required")
	}

	// Generate unique room name
	const roomName = `call-${nanoid(12)}`
	const isGroup = participantIds.length > 1

	// Create call record
	const [call] = await db
		.insert(calls)
		.values({
			roomName,
			initiatorId: user.id,
			type,
			status: "ringing",
			isGroup,
			chatChannel: chatChannel || null,
		})
		.returning()

	// Add initiator as participant
	await db.insert(callParticipants).values({
		callId: call.id,
		userId: user.id,
		status: "joined",
		role: "initiator",
		joinedAt: new Date(),
		hadVideo: type === "video",
		hadAudio: true,
	})

	// Add other participants
	await db.insert(callParticipants).values(
		participantIds.map((pid) => ({
			callId: call.id,
			userId: pid,
			status: "ringing" as const,
			role: "participant" as const,
		}))
	)

	// Generate token for initiator FIRST (with roomCreate permission)
	// This ensures the caller gets the token and can connect before the callee tries to join
	console.log("[Call] Initiator connecting to room:", roomName, "user:", user.id, user.name)
	const token = await createLiveKitToken(roomName, user.name || "User", user.id, true)
	if (!token) {
		throw new Error("Failed to generate call token")
	}

	const wsUrl = getLiveKitUrl()
	if (!wsUrl) {
		throw new Error("LiveKit URL not configured")
	}

	// Get participant info for the event
	const participantUsers = await db
		.select({ id: users.id, name: users.name, image: users.image })
		.from(users)
		.where(inArray(users.id, participantIds))

	// Send incoming call event to all participants via Pusher AFTER token is ready
	// The caller's client will immediately connect with the token, creating the room
	if (pusherServer) {
		const event: IncomingCallEvent = {
			callId: call.id,
			roomName,
			initiator: {
				id: user.id,
				name: user.name || "Unknown",
				image: user.image || null,
			},
			type,
			isGroup,
			chatChannel: chatChannel || null,
			participants: participantUsers.map((p) => ({
				id: p.id,
				name: p.name || "Unknown",
				image: p.image,
			})),
			sentAt: Date.now(),
		}

		// Non-blocking: send to all participants
		for (const pid of participantIds) {
			pusherServer.trigger(`private-user-${pid}`, "incoming-call", event).catch(console.error)
		}
	}

	console.log("[Call] Returning call data - roomName:", roomName, "wsUrl:", wsUrl)
	return { callId: call.id, roomName, token, wsUrl }
}

export async function acceptCall(callId: string): Promise<{ token: string; wsUrl: string; roomName: string }> {
	if (!isLiveKitConfigured()) {
		throw new Error("Calling is not configured")
	}

	const user = await getCurrentUser()

	// Get the call
	const [call] = await db
		.select()
		.from(calls)
		.where(eq(calls.id, callId))
		.limit(1)

	if (!call || call.status !== "ringing") {
		throw new Error("Call is no longer available")
	}

	// Update participant status
	await db
		.update(callParticipants)
		.set({ status: "joined", joinedAt: new Date() })
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.userId, user.id)
			)
		)

	// If this is the first participant to join (besides initiator), update call status
	const joinedCount = await db
		.select()
		.from(callParticipants)
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.status, "joined")
			)
		)

	if (joinedCount.length === 2) {
		// First participant joined, call is now connected
		await db
			.update(calls)
			.set({ status: "connected", startedAt: new Date() })
			.where(eq(calls.id, callId))
	}

	// Notify initiator that call was accepted
	if (pusherServer) {
		const event: CallAcceptedEvent = {
			callId,
			userId: user.id,
			userName: user.name || "Unknown",
		}
		pusherServer.trigger(`private-user-${call.initiatorId}`, "call-accepted", event).catch(console.error)

		// Also notify other participants
		const participants = await db
			.select({ userId: callParticipants.userId })
			.from(callParticipants)
			.where(
				and(
					eq(callParticipants.callId, callId),
					eq(callParticipants.status, "joined")
				)
			)

		const joinedEvent: ParticipantJoinedEvent = {
			callId,
			userId: user.id,
			userName: user.name || "Unknown",
			userImage: user.image || null,
		}

		for (const p of participants) {
			if (p.userId !== user.id) {
				pusherServer.trigger(`private-user-${p.userId}`, "participant-joined", joinedEvent).catch(console.error)
			}
		}
	}

	// Generate fresh token for accepter (with roomCreate permission as fallback)
	console.log("[Call] Accepter connecting to room:", call.roomName, "user:", user.id, user.name)
	const token = await createLiveKitToken(call.roomName, user.name || "User", user.id, true)
	if (!token) {
		throw new Error("Failed to generate call token")
	}

	const wsUrl = getLiveKitUrl()
	if (!wsUrl) {
		throw new Error("LiveKit URL not configured")
	}

	console.log("[Call] Returning accept data - roomName:", call.roomName, "wsUrl:", wsUrl)
	return { token, wsUrl, roomName: call.roomName }
}

export async function declineCall(callId: string): Promise<void> {
	const user = await getCurrentUser()

	// Get the call
	const [call] = await db
		.select()
		.from(calls)
		.where(eq(calls.id, callId))
		.limit(1)

	if (!call) {
		throw new Error("Call not found")
	}

	// Update participant status
	await db
		.update(callParticipants)
		.set({ status: "declined", leftAt: new Date() })
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.userId, user.id)
			)
		)

	// Check if all participants have declined
	const remainingParticipants = await db
		.select()
		.from(callParticipants)
		.where(
			and(
				eq(callParticipants.callId, callId),
				inArray(callParticipants.status, ["ringing", "joined"])
			)
		)

	// If only initiator remains (or no one), end the call
	const nonInitiatorRemaining = remainingParticipants.filter((p) => p.role !== "initiator")
	if (nonInitiatorRemaining.length === 0) {
		await db
			.update(calls)
			.set({ status: "declined", endedAt: new Date(), endReason: "declined" })
			.where(eq(calls.id, callId))

		// Create declined call message
		await createCallMessage({
			senderId: call.initiatorId,
			recipientIds: [user.id],
			callId,
			callType: call.type as CallType,
			callStatus: "declined",
		})
	}

	// Notify initiator
	if (pusherServer) {
		const event: CallDeclinedEvent = {
			callId,
			userId: user.id,
			userName: user.name || "Unknown",
		}
		pusherServer.trigger(`private-user-${call.initiatorId}`, "call-declined", event).catch(console.error)
	}
}

export async function endCall(callId: string): Promise<void> {
	const user = await getCurrentUser()

	// Get the call
	const [call] = await db
		.select()
		.from(calls)
		.where(eq(calls.id, callId))
		.limit(1)

	if (!call) {
		throw new Error("Call not found")
	}

	// Calculate duration
	let durationSeconds: number | null = null
	if (call.startedAt) {
		durationSeconds = Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
	}

	// Update call status
	await db
		.update(calls)
		.set({
			status: "ended",
			endedAt: new Date(),
			endReason: "completed",
			durationSeconds,
		})
		.where(eq(calls.id, callId))

	// Update all participants who haven't left
	await db
		.update(callParticipants)
		.set({ status: "left", leftAt: new Date() })
		.where(
			and(
				eq(callParticipants.callId, callId),
				inArray(callParticipants.status, ["joined", "ringing"])
			)
		)

	// Get all participants for message creation
	const participants = await db
		.select({ userId: callParticipants.userId })
		.from(callParticipants)
		.where(eq(callParticipants.callId, callId))

	// Create ended call message with duration
	const otherParticipantIds = participants.filter((p) => p.userId !== call.initiatorId).map((p) => p.userId)
	await createCallMessage({
		senderId: call.initiatorId,
		recipientIds: otherParticipantIds,
		callId,
		callType: call.type as CallType,
		callStatus: "ended",
		durationSeconds: durationSeconds ?? undefined,
	})

	// Notify all participants
	if (pusherServer) {
		const event: CallEndedEvent = {
			callId,
			endReason: "completed",
			endedBy: user.id,
		}

		for (const p of participants) {
			pusherServer.trigger(`private-user-${p.userId}`, "call-ended", event).catch(console.error)
		}
	}
}

export async function leaveCall(callId: string): Promise<void> {
	const user = await getCurrentUser()

	// Update participant status
	await db
		.update(callParticipants)
		.set({ status: "left", leftAt: new Date() })
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.userId, user.id)
			)
		)

	// Check remaining participants
	const remaining = await db
		.select()
		.from(callParticipants)
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.status, "joined")
			)
		)

	// If only one or no one left, end the call
	if (remaining.length <= 1) {
		const [call] = await db
			.select()
			.from(calls)
			.where(eq(calls.id, callId))
			.limit(1)

		if (call) {
			let durationSeconds: number | null = null
			if (call.startedAt) {
				durationSeconds = Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
			}

			await db
				.update(calls)
				.set({
					status: "ended",
					endedAt: new Date(),
					endReason: "completed",
					durationSeconds,
				})
				.where(eq(calls.id, callId))

			// Notify remaining participant
			if (pusherServer && remaining.length === 1) {
				const event: CallEndedEvent = {
					callId,
					endReason: "completed",
					endedBy: user.id,
				}
				pusherServer.trigger(`private-user-${remaining[0].userId}`, "call-ended", event).catch(console.error)
			}
		}
	} else {
		// Notify others that user left
		if (pusherServer) {
			for (const p of remaining) {
				if (p.userId !== user.id) {
					pusherServer
						.trigger(`private-user-${p.userId}`, "participant-left", {
							callId,
							userId: user.id,
							userName: user.name || "Unknown",
						})
						.catch(console.error)
				}
			}
		}
	}
}

export async function getActiveCall(): Promise<CallWithParticipants | null> {
	const user = await getCurrentUser()

	// Find any call where user is a participant and call is active
	const [participant] = await db
		.select()
		.from(callParticipants)
		.innerJoin(calls, eq(calls.id, callParticipants.callId))
		.where(
			and(
				eq(callParticipants.userId, user.id),
				inArray(callParticipants.status, ["joined", "ringing"]),
				inArray(calls.status, ["ringing", "connected"])
			)
		)
		.limit(1)

	if (!participant) return null

	const call = participant.calls

	// Get initiator info
	const [initiator] = await db
		.select({ id: users.id, name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, call.initiatorId))
		.limit(1)

	// Get all participants
	const participantsData = await db
		.select({
			id: users.id,
			name: users.name,
			image: users.image,
			status: callParticipants.status,
			role: callParticipants.role,
		})
		.from(callParticipants)
		.innerJoin(users, eq(users.id, callParticipants.userId))
		.where(eq(callParticipants.callId, call.id))

	return {
		...call,
		type: call.type as "voice" | "video",
		status: call.status as "ringing" | "connected" | "ended" | "missed" | "declined" | "failed",
		isGroup: call.isGroup ?? false,
		metadata: (call.metadata as CallWithParticipants["metadata"]) ?? {},
		initiator: {
			id: initiator?.id || call.initiatorId,
			name: initiator?.name || "Unknown",
			image: initiator?.image || null,
		},
		participants: participantsData.map((p) => ({
			id: p.id,
			name: p.name || "Unknown",
			image: p.image,
			status: p.status as "invited" | "ringing" | "joined" | "left" | "declined" | "missed",
			role: p.role as "initiator" | "participant",
		})),
	}
}

export async function getCallHistory(limit = 20): Promise<CallHistoryItem[]> {
	const user = await getCurrentUser()

	// Get calls where user was a participant
	const userCalls = await db
		.select({ callId: callParticipants.callId })
		.from(callParticipants)
		.where(eq(callParticipants.userId, user.id))

	const callIds = userCalls.map((c) => c.callId)

	if (callIds.length === 0) return []

	const callsData = await db
		.select()
		.from(calls)
		.where(
			and(
				inArray(calls.id, callIds),
				inArray(calls.status, ["ended", "missed", "declined"])
			)
		)
		.orderBy(desc(calls.createdAt))
		.limit(limit)

	const result: CallHistoryItem[] = []

	for (const call of callsData) {
		const participantsData = await db
			.select({
				id: users.id,
				name: users.name,
				image: users.image,
				role: callParticipants.role,
			})
			.from(callParticipants)
			.innerJoin(users, eq(users.id, callParticipants.userId))
			.where(eq(callParticipants.callId, call.id))

		result.push({
			id: call.id,
			type: call.type as "voice" | "video",
			status: call.status as "ringing" | "connected" | "ended" | "missed" | "declined" | "failed",
			isGroup: call.isGroup ?? false,
			chatChannel: call.chatChannel,
			startedAt: call.createdAt.toISOString(),
			endedAt: call.endedAt?.toISOString() || null,
			durationSeconds: call.durationSeconds,
			isInitiator: call.initiatorId === user.id,
			participants: participantsData.map((p) => ({
				id: p.id,
				name: p.name || "Unknown",
				image: p.image,
				isInitiator: p.role === "initiator",
			})),
		})
	}

	return result
}

export async function markCallAsMissed(callId: string): Promise<void> {
	const user = await getCurrentUser()

	// Update participant status
	await db
		.update(callParticipants)
		.set({ status: "missed", leftAt: new Date() })
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.userId, user.id)
			)
		)

	// Check if all participants missed
	const remaining = await db
		.select()
		.from(callParticipants)
		.where(
			and(
				eq(callParticipants.callId, callId),
				inArray(callParticipants.status, ["ringing", "joined"])
			)
		)

	const nonInitiator = remaining.filter((p) => p.role !== "initiator")
	if (nonInitiator.length === 0) {
		// Get call details for the message
		const [call] = await db
			.select()
			.from(calls)
			.where(eq(calls.id, callId))
			.limit(1)

		if (call) {
			await db
				.update(calls)
				.set({ status: "missed", endedAt: new Date(), endReason: "timeout" })
				.where(eq(calls.id, callId))

			// Create missed call message
			await createCallMessage({
				senderId: call.initiatorId,
				recipientIds: [user.id],
				callId,
				callType: call.type as CallType,
				callStatus: "missed",
			})
		}
	}
}
