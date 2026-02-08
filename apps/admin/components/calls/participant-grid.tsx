"use client"

import { ParticipantTile } from "./participant-tile"
import { cn } from "@/lib/utils"
import type { Participant } from "@/hooks/use-livekit-room"

type ParticipantGridProps = {
	participants: Participant[]
	dominantSpeaker: string | null
	className?: string
	hideLocal?: boolean
}

export function ParticipantGrid({ participants, dominantSpeaker, className, hideLocal }: ParticipantGridProps) {
	// Filter out local participant on mobile when chat is open
	const visibleParticipants = hideLocal
		? participants.filter((p) => !p.isLocal)
		: participants
	const count = visibleParticipants.length

	// Check if anyone is screen sharing
	const screenSharer = visibleParticipants.find((p) => p.isScreenSharing)

	// If someone is screen sharing, show their screen prominently
	if (screenSharer) {
		return (
			<div className={cn("flex flex-col gap-2 size-full", className)}>
				{/* Screen share takes most space */}
				<div className="flex-1 min-h-0">
					<ParticipantTile
						participant={screenSharer}
						isSpeaker={screenSharer.identity === dominantSpeaker}
						showScreenShare
						className="size-full"
					/>
				</div>

				{/* Participants in a row at bottom */}
				<div className="flex gap-2 h-24 shrink-0 overflow-x-auto">
					{visibleParticipants.map((p) => (
						<ParticipantTile
							key={p.identity}
							participant={p}
							isSpeaker={p.identity === dominantSpeaker}
							className="w-32 h-full shrink-0"
						/>
					))}
				</div>
			</div>
		)
	}

	// 1-on-1 call: responsive layout
	// Desktop: side by side (you left, them right)
	// Mobile: stacked (them top, you bottom)
	if (!hideLocal && participants.length === 2) {
		const local = participants.find((p) => p.isLocal)
		const remote = participants.find((p) => !p.isLocal)

		if (local && remote) {
			return (
				<div className={cn(
					"grid gap-2 size-full",
					// Mobile: single column stacked, Desktop: two columns side by side
					"grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1",
					className
				)}>
					{/* Local participant: left on desktop, bottom on mobile */}
					<ParticipantTile
						participant={local}
						isSpeaker={local.identity === dominantSpeaker}
						className={cn(
							"min-h-30",
							// Mobile: put local at bottom (order-2), Desktop: left (order-1)
							"order-2 md:order-1"
						)}
					/>
					{/* Remote participant: right on desktop, top on mobile */}
					<ParticipantTile
						participant={remote}
						isSpeaker={remote.identity === dominantSpeaker}
						className={cn(
							"min-h-30",
							// Mobile: put remote at top (order-1), Desktop: right (order-2)
							"order-1 md:order-2"
						)}
					/>
				</div>
			)
		}
	}

	// Grid layout based on participant count
	const gridClass = cn(
		"grid gap-2 size-full",
		count === 1 && "grid-cols-1",
		count >= 3 && count <= 4 && "grid-cols-2 grid-rows-2",
		count >= 5 && count <= 6 && "grid-cols-3 grid-rows-2",
		count >= 7 && count <= 9 && "grid-cols-3 grid-rows-3",
		count >= 10 && "grid-cols-4 auto-rows-fr overflow-y-auto",
		className
	)

	return (
		<div className={gridClass}>
			{visibleParticipants.map((p) => (
				<ParticipantTile
					key={p.identity}
					participant={p}
					isSpeaker={p.identity === dominantSpeaker}
					className="min-h-30"
				/>
			))}
		</div>
	)
}
