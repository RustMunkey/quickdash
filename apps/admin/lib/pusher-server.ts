import Pusher from "pusher"
import { env } from "@/env"

const globalForPusher = globalThis as unknown as { pusher: Pusher | undefined }

function createPusherServer(): Pusher | null {
	if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET || !env.PUSHER_CLUSTER) {
		return null
	}
	return new Pusher({
		appId: env.PUSHER_APP_ID,
		key: env.PUSHER_KEY,
		secret: env.PUSHER_SECRET,
		cluster: env.PUSHER_CLUSTER,
		useTLS: true,
	})
}

export const pusherServer = globalForPusher.pusher ?? createPusherServer()

if (process.env.NODE_ENV !== "production" && pusherServer) {
	globalForPusher.pusher = pusherServer
}
