"use client"

import { useEffect, useRef } from "react"
import type { Track } from "livekit-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import { MicOff01Icon, ComputerIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import type { Participant } from "@/hooks/use-livekit-room"

type ParticipantTileProps = {
	participant: Participant
	isSpeaker?: boolean
	showScreenShare?: boolean
	className?: string
}

export function ParticipantTile({
	participant,
	isSpeaker,
	showScreenShare,
	className,
}: ParticipantTileProps) {
	const videoRef = useRef<HTMLVideoElement>(null)

	const initials = participant.name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)

	// Attach video track — uses trackSid as dependency to avoid unnecessary re-attachments
	// The track object reference may change on participant rebuilds, but the SID stays
	// stable as long as it's the same underlying track
	const trackSid = showScreenShare ? participant.screenTrackSid : participant.videoTrackSid
	const track = showScreenShare ? participant.screenTrack : participant.videoTrack

	useEffect(() => {
		const videoEl = videoRef.current
		if (!track || !videoEl) return

		try {
			track.attach(videoEl)
		} catch (err) {
			console.error("[ParticipantTile] Failed to attach video:", err)
		}

		return () => {
			try {
				track.detach(videoEl)
			} catch {
				// Ignore detach errors
			}
		}
	}, [participant.identity, trackSid]) // trackSid is stable — only re-runs when actual track changes

	const showVideo = showScreenShare
		? participant.isScreenSharing && participant.screenTrack
		: participant.isVideoEnabled && participant.videoTrack

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg bg-muted",
				isSpeaker && "ring-2 ring-primary",
				className
			)}
		>
			{/* Video element */}
			{showVideo ? (
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={participant.isLocal}
					className="size-full object-cover"
					style={participant.isLocal && !showScreenShare ? { transform: "scaleX(-1)" } : undefined}
				/>
			) : (
				// Avatar fallback
				<div className="size-full flex items-center justify-center bg-muted">
					<Avatar className="size-20">
						<AvatarFallback className="text-2xl">{initials}</AvatarFallback>
					</Avatar>
				</div>
			)}

			{/* Audio is handled by RemoteAudioRenderer in call-interface.tsx — not here.
			    This prevents duplicate audio attachments that cause crackling over time. */}

			{/* Overlay with name and indicators */}
			<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-white truncate">
						{participant.name}
						{participant.isLocal && " (You)"}
					</span>

					<div className="flex items-center gap-2">
						{participant.isScreenSharing && !showScreenShare && (
							<div className="flex size-6 items-center justify-center rounded-full bg-blue-500/80">
								<HugeiconsIcon icon={ComputerIcon} size={12} className="text-white" />
							</div>
						)}
						{participant.isMuted && (
							<div className="flex size-6 items-center justify-center rounded-full bg-red-500/80">
								<HugeiconsIcon icon={MicOff01Icon} size={12} className="text-white" />
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Speaking indicator */}
			{participant.isSpeaking && (
				<div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-primary animate-pulse" />
			)}
		</div>
	)
}
