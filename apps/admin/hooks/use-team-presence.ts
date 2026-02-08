"use client"

import { useMemo, useState, useEffect } from "react"
import { usePresence } from "@/hooks/use-presence"
import { usePusher } from "@/components/pusher-provider"
import type { PresenceStatus } from "@/components/presence/status-indicator"

/**
 * Hook to get presence status for team members and friends.
 * Uses the presence-admin channel to determine who's online,
 * and listens for client-status-change events to get actual
 * status (online, idle, dnd, invisible).
 */
export function useTeamPresence() {
	const { members, me, isConnected } = usePresence()
	const { pusher } = usePusher()
	const [broadcastStatuses, setBroadcastStatuses] = useState<Map<string, PresenceStatus>>(new Map())

	// Listen for status broadcasts from other users
	useEffect(() => {
		if (!pusher || !isConnected) return

		const channel = pusher.channel("presence-admin")
		if (!channel) return

		const handleStatusChange = (data: { userId: string; status: PresenceStatus }) => {
			setBroadcastStatuses((prev) => {
				const next = new Map(prev)
				next.set(data.userId, data.status)
				return next
			})
		}

		// Clean up when a member leaves - remove their broadcast status
		const handleMemberRemoved = (member: { id: string }) => {
			setBroadcastStatuses((prev) => {
				const next = new Map(prev)
				next.delete(member.id)
				return next
			})
		}

		channel.bind("status-change", handleStatusChange)
		channel.bind("pusher:member_removed", handleMemberRemoved)

		return () => {
			channel.unbind("status-change", handleStatusChange)
			channel.unbind("pusher:member_removed", handleMemberRemoved)
		}
	}, [pusher, isConnected])

	// Build a set of connected member IDs for fast lookup
	const connectedIds = useMemo(() => {
		return new Set(members.map((m) => m.id))
	}, [members])

	/**
	 * Get the presence status for a specific user.
	 * Priority: broadcast status > presence channel membership > offline
	 */
	const getStatus = (userId: string): PresenceStatus => {
		if (!isConnected) return "offline"

		// Not in the presence channel = truly offline
		if (!connectedIds.has(userId)) return "offline"

		// Check if they've broadcast a specific status
		const broadcast = broadcastStatuses.get(userId)
		if (broadcast) return broadcast

		// In presence channel with no broadcast = online (auto mode)
		return "online"
	}

	/**
	 * Check if a specific user is online (connected to presence channel)
	 */
	const isOnline = (userId: string): boolean => {
		return connectedIds.has(userId)
	}

	return {
		getStatus,
		isOnline,
		onlineCount: members.length,
		myId: me?.id,
	}
}
