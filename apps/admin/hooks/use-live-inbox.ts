"use client"

import { useEffect } from "react"
import { usePusher } from "@/components/pusher-provider"
import type { InboxEmail } from "@/app/(dashboard)/messages/types"

interface LiveInboxEmail {
	id: string
	fromName: string
	fromEmail: string
	subject: string
	body: string
	receivedAt: string
	status: "unread" | "read" | "replied"
}

interface UseLiveInboxOptions {
	onNewEmail?: (email: LiveInboxEmail) => void
}

export function useLiveInbox({ onNewEmail }: UseLiveInboxOptions = {}) {
	const { pusher, isConnected, workspaceId } = usePusher()

	useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-inbox`
		const channel = pusher.subscribe(channelName)

		channel.bind("new-email", (data: LiveInboxEmail) => {
			onNewEmail?.({
				...data,
				status: "unread",
			})
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, onNewEmail])
}
