import { AccessToken, RoomServiceClient } from "livekit-server-sdk"
import { env } from "@/env"

// Room service client for debugging
let roomServiceClient: RoomServiceClient | null = null

function getRoomServiceClient(): RoomServiceClient | null {
	if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
		return null
	}
	if (!roomServiceClient) {
		// Convert WSS URL to HTTPS for API
		const apiUrl = env.LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
		roomServiceClient = new RoomServiceClient(apiUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET)
	}
	return roomServiceClient
}

export async function listRoomParticipants(roomName: string): Promise<{ identity: string; sid: string }[]> {
	const client = getRoomServiceClient()
	if (!client) {
		console.log("[LiveKit] Room service not configured")
		return []
	}
	try {
		const participants = await client.listParticipants(roomName)
		console.log("[LiveKit] Room", roomName, "has", participants.length, "participants:",
			participants.map(p => ({ identity: p.identity, sid: p.sid })))
		return participants.map(p => ({ identity: p.identity, sid: p.sid }))
	} catch (err) {
		console.log("[LiveKit] Error listing participants for room", roomName, ":", err)
		return []
	}
}

export async function listActiveRooms(): Promise<{ name: string; numParticipants: number }[]> {
	const client = getRoomServiceClient()
	if (!client) {
		console.log("[LiveKit] Room service not configured")
		return []
	}
	try {
		const rooms = await client.listRooms()
		console.log("[LiveKit] Active rooms:", rooms.map(r => ({ name: r.name, numParticipants: r.numParticipants })))
		return rooms.map(r => ({ name: r.name, numParticipants: r.numParticipants }))
	} catch (err) {
		console.log("[LiveKit] Error listing rooms:", err)
		return []
	}
}

export function isLiveKitConfigured(): boolean {
	return !!(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET && env.LIVEKIT_URL)
}

export async function createLiveKitToken(
	roomName: string,
	participantName: string,
	participantIdentity: string,
	isInitiator = false
): Promise<string | null> {
	if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
		return null
	}

	const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
		identity: participantIdentity,
		name: participantName,
		ttl: "2h", // Token valid for 2 hours
	})

	token.addGrant({
		room: roomName,
		roomJoin: true,
		roomCreate: isInitiator, // Only initiator can create the room
		canPublish: true,
		canSubscribe: true,
		canPublishData: true,
	})

	return await token.toJwt()
}

export function getLiveKitUrl(): string | null {
	return env.LIVEKIT_URL || null
}
