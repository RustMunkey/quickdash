"use client"

import { useEffect, useState, useCallback } from "react"
import { usePusher } from "@/components/pusher-provider"
import type { PresenceChannel, Members } from "pusher-js"

export interface PageViewer {
	id: string
	name: string
	image?: string
	role?: string
}

export interface UsePagePresenceOptions {
	resourceType: string // "order" | "product" | "customer" etc.
	resourceId: string
	enabled?: boolean
}

/**
 * Hook for tracking who is viewing a specific resource
 * Subscribes to presence-page-{type}-{id} channel
 */
export function usePagePresence({
	resourceType,
	resourceId,
	enabled = true,
}: UsePagePresenceOptions) {
	const { pusher, isConnected } = usePusher()
	const [viewers, setViewers] = useState<PageViewer[]>([])
	const [me, setMe] = useState<PageViewer | null>(null)

	const channelName = `presence-page-${resourceType}-${resourceId}`

	useEffect(() => {
		if (!pusher || !isConnected || !enabled || !resourceId) return

		const channel = pusher.subscribe(channelName) as PresenceChannel

		channel.bind("pusher:subscription_succeeded", (memberList: Members) => {
			const viewerArray: PageViewer[] = []
			memberList.each((member: { id: string; info: { name: string; image?: string; role?: string } }) => {
				viewerArray.push({
					id: member.id,
					name: member.info.name,
					image: member.info.image,
					role: member.info.role,
				})
			})
			setViewers(viewerArray)
			if (memberList.me) {
				setMe({
					id: memberList.me.id,
					name: memberList.me.info.name,
					image: memberList.me.info.image,
					role: memberList.me.info.role,
				})
			}
		})

		channel.bind("pusher:member_added", (member: { id: string; info: { name: string; image?: string; role?: string } }) => {
			setViewers((prev) => [
				...prev.filter((v) => v.id !== member.id),
				{
					id: member.id,
					name: member.info.name,
					image: member.info.image,
					role: member.info.role,
				},
			])
		})

		channel.bind("pusher:member_removed", (member: { id: string }) => {
			setViewers((prev) => prev.filter((v) => v.id !== member.id))
		})

		return () => {
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, channelName, enabled, resourceId])

	// Get other viewers (excluding self)
	const others = viewers.filter((v) => v.id !== me?.id)

	return {
		viewers,
		others,
		me,
		count: viewers.length,
		othersCount: others.length,
		isConnected,
	}
}
