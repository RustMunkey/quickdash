"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher-server"

export async function broadcastStatusChange(status: string) {
	if (!pusherServer) return

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return

	await pusherServer.trigger("presence-admin", "status-change", {
		userId: session.user.id,
		status,
	})
}
