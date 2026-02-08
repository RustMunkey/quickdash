"use client"

import { useEffect, useState, useCallback } from "react"
import { usePusher } from "@/components/pusher-provider"
import type { PresenceChannel, Members } from "pusher-js"

export interface PresenceMember {
	id: string
	info: {
		name: string
		image?: string
		role?: string
	}
}

export interface UsePresenceOptions {
	channelName?: string
	onMemberAdded?: (member: PresenceMember) => void
	onMemberRemoved?: (member: PresenceMember) => void
}

/**
 * Hook for global admin presence tracking
 * Subscribes to presence-admin channel by default
 */
export function usePresence(options: UsePresenceOptions = {}) {
	const { pusher, isConnected } = usePusher()
	const [members, setMembers] = useState<PresenceMember[]>([])
	const [me, setMe] = useState<PresenceMember | null>(null)
	const channelName = options.channelName || "presence-admin"

	useEffect(() => {
		if (!pusher || !isConnected) return

		const channel = pusher.subscribe(channelName) as PresenceChannel

		channel.bind("pusher:subscription_succeeded", (memberList: Members) => {
			const memberArray: PresenceMember[] = []
			memberList.each((member: { id: string; info: PresenceMember["info"] }) => {
				memberArray.push({ id: member.id, info: member.info })
			})
			setMembers(memberArray)
			setMe(memberList.me ? { id: memberList.me.id, info: memberList.me.info } : null)
		})

		channel.bind("pusher:member_added", (member: { id: string; info: PresenceMember["info"] }) => {
			const newMember = { id: member.id, info: member.info }
			setMembers((prev) => [...prev.filter((m) => m.id !== member.id), newMember])
			options.onMemberAdded?.(newMember)
		})

		channel.bind("pusher:member_removed", (member: { id: string; info: PresenceMember["info"] }) => {
			setMembers((prev) => prev.filter((m) => m.id !== member.id))
			options.onMemberRemoved?.({ id: member.id, info: member.info })
		})

		return () => {
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, channelName, options.onMemberAdded, options.onMemberRemoved])

	// Get other members (excluding self)
	const others = members.filter((m) => m.id !== me?.id)

	return {
		members,
		others,
		me,
		count: members.length,
		isConnected,
	}
}
