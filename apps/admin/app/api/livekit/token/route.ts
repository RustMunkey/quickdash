import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { calls, callParticipants } from "@quickdash/db/schema"
import { createLiveKitToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/livekit-server"

export async function POST(request: Request) {
	if (!isLiveKitConfigured()) {
		return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 })
	}

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = await request.json()
	const { callId } = body

	if (!callId) {
		return NextResponse.json({ error: "callId is required" }, { status: 400 })
	}

	// Verify user is a participant of this call
	const [call] = await db
		.select()
		.from(calls)
		.where(eq(calls.id, callId))
		.limit(1)

	if (!call) {
		return NextResponse.json({ error: "Call not found" }, { status: 404 })
	}

	// Check if user is either the initiator or a participant
	const isInitiator = call.initiatorId === session.user.id

	const [participant] = await db
		.select()
		.from(callParticipants)
		.where(
			and(
				eq(callParticipants.callId, callId),
				eq(callParticipants.userId, session.user.id)
			)
		)
		.limit(1)

	if (!isInitiator && !participant) {
		return NextResponse.json({ error: "Not a participant of this call" }, { status: 403 })
	}

	// Generate LiveKit token
	const token = await createLiveKitToken(
		call.roomName,
		session.user.name || "User",
		session.user.id
	)

	if (!token) {
		return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
	}

	const wsUrl = getLiveKitUrl()

	return NextResponse.json({
		token,
		wsUrl,
		roomName: call.roomName,
	})
}
