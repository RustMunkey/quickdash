"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { usePusher } from "@/components/pusher-provider"

/**
 * Global message sound provider.
 * Plays message.mp3 for incoming DMs on ALL pages,
 * EXCEPT when the user is on the /messages page (handled locally there).
 */
export function MessageSoundProvider({
	userId,
	children,
}: {
	userId: string
	children: ReactNode
}) {
	const { pusher } = usePusher()
	const pathname = usePathname()
	const pathnameRef = useRef(pathname)

	// Keep ref in sync so Pusher handler always has latest pathname
	useEffect(() => {
		pathnameRef.current = pathname
	}, [pathname])

	useEffect(() => {
		if (!pusher || !userId) return

		const channelName = `private-user-${userId}`
		const ch = pusher.subscribe(channelName)

		const handleDmReceived = (data: {
			message: { senderId: string }
		}) => {
			// Don't play if this is our own message
			if (data.message.senderId === userId) return

			// Don't play on messages page — the local components handle sound there
			if (pathnameRef.current?.startsWith("/messages")) return

			const audio = new Audio("/sounds/message.mp3")
			audio.volume = 0.5
			audio.play().catch(() => {})
		}

		ch.bind("dm-received", handleDmReceived)

		return () => {
			ch.unbind("dm-received", handleDmReceived)
		}
	}, [pusher, userId])

	return <>{children}</>
}
