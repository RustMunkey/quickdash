"use client"

import { useEffect } from "react"
import { useMusicPlayer, type Track } from "./music-player-provider"
import { getUserAudioTracks } from "@/app/(dashboard)/settings/music/actions"

export function MusicPlayerLoader() {
	const { setTracks } = useMusicPlayer()

	useEffect(() => {
		// Load user's audio tracks on mount
		getUserAudioTracks()
			.then((dbTracks) => {
				const uploadedTracks: Track[] = dbTracks.map((t) => ({
					id: t.id,
					name: t.name,
					url: t.url,
					artist: t.artist || undefined,
					duration: t.duration || undefined,
					type: "uploaded" as const,
				}))
				setTracks(uploadedTracks)
			})
			.catch(() => {
				// Ignore errors - user might not have any tracks
			})
	}, [setTracks])

	return null
}
