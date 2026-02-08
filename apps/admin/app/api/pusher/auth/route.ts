import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher-server"
import { getActiveWorkspace } from "@/lib/workspace"
import { parseWorkspaceChannel } from "@/lib/pusher-channels"
import { db } from "@quickdash/db/client"
import { workspaceMembers } from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"

// Base channel names that require workspace scoping
const WORKSPACE_CHANNELS = new Set([
	"orders",
	"inventory",
	"analytics",
	"products",
	"customers",
	"subscriptions",
	"inbox",
	"auctions",
])

export async function POST(request: Request) {
	if (!pusherServer) {
		return NextResponse.json({ error: "Pusher not configured" }, { status: 503 })
	}

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = await request.formData()
	const socketId = body.get("socket_id") as string
	const channel = body.get("channel_name") as string

	// User-specific private channel - only the user can subscribe
	if (channel.startsWith("private-user-")) {
		const channelUserId = channel.replace("private-user-", "")
		if (channelUserId !== session.user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}
	}

	// Workspace-scoped channels: private-workspace-{workspaceId}-{channel}
	const parsed = parseWorkspaceChannel(channel)
	if (parsed && WORKSPACE_CHANNELS.has(parsed.channel)) {
		// Verify user is a member of this workspace
		const [membership] = await db
			.select({ id: workspaceMembers.id })
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, parsed.workspaceId),
					eq(workspaceMembers.userId, session.user.id)
				)
			)
			.limit(1)

		if (!membership) {
			return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
		}

		const authResponse = pusherServer.authorizeChannel(socketId, channel)
		return NextResponse.json(authResponse)
	}

	// Presence channels (presence-admin, presence-page-{type}-{id})
	if (channel.startsWith("presence-")) {
		const presenceData = {
			user_id: session.user.id,
			user_info: {
				name: session.user.name,
				image: session.user.image,
				role: session.user.role,
			},
		}
		const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData)
		return NextResponse.json(authResponse)
	}

	const authResponse = pusherServer.authorizeChannel(socketId, channel)
	return NextResponse.json(authResponse)
}
