"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { usePresence } from "@/hooks/use-presence"
import { usePusher } from "@/components/pusher-provider"
import { useUserStatusProvider, UserStatusContext } from "@/hooks/use-user-status"
import { broadcastStatusChange } from "@/lib/presence-actions"

export function UserStatusProvider({ children }: { children: ReactNode }) {
	const { isConnected, me } = usePresence()
	const { pusher } = usePusher()
	const statusValue = useUserStatusProvider(isConnected)
	const statusRef = useRef(statusValue.status)
	statusRef.current = statusValue.status

	// Broadcast status changes via server-side Pusher trigger
	useEffect(() => {
		if (!isConnected || !me?.id) return
		broadcastStatusChange(statusValue.status)
	}, [statusValue.status, isConnected, me?.id])

	// Re-broadcast own status when a new member joins so they see our current status
	useEffect(() => {
		if (!pusher || !isConnected || !me?.id) return

		const channel = pusher.channel("presence-admin")
		if (!channel) return

		const handleMemberAdded = () => {
			broadcastStatusChange(statusRef.current)
		}

		channel.bind("pusher:member_added", handleMemberAdded)
		return () => {
			channel.unbind("pusher:member_added", handleMemberAdded)
		}
	}, [pusher, isConnected, me?.id])

	return (
		<UserStatusContext.Provider value={statusValue}>
			{children}
		</UserStatusContext.Provider>
	)
}
