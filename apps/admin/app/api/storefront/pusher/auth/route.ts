import { type NextRequest } from "next/server"
import { pusherServer } from "@/lib/pusher-server"
import { parseWorkspaceChannel } from "@/lib/pusher-channels"
import { validateStorefrontRequest, handleCorsOptions, storefrontError } from "@/lib/storefront-auth"

// Storefront Pusher auth endpoint.
// Validates the X-Storefront-Key and only allows subscribing to channels
// that belong to that storefront's workspace — other workspaces are blocked.
export async function POST(request: NextRequest) {
	if (!pusherServer) {
		return storefrontError("Pusher not configured", 503)
	}

	const auth = await validateStorefrontRequest(request)
	if (!auth.success) {
		return storefrontError(auth.error, auth.status)
	}

	const body = await request.formData()
	const socketId = body.get("socket_id") as string
	const channel = body.get("channel_name") as string

	if (!socketId || !channel) {
		return storefrontError("Missing socket_id or channel_name", 400)
	}

	// Only allow workspace-scoped private channels for this storefront's workspace
	const parsed = parseWorkspaceChannel(channel)
	if (!parsed || parsed.workspaceId !== auth.storefront.workspaceId) {
		return storefrontError("Forbidden: channel does not belong to this workspace", 403)
	}

	const authResponse = pusherServer.authorizeChannel(socketId, channel)
	return Response.json(authResponse)
}

export const OPTIONS = handleCorsOptions
