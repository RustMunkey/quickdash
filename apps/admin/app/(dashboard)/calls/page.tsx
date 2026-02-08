"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Call02Icon, Video01Icon, ArrowRight01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { getCallHistory } from "./actions"
import { useCall } from "@/components/calls"
import type { CallHistoryItem } from "./types"

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

function formatDuration(seconds: number | null): string {
	if (!seconds) return "—"
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	if (mins === 0) return `${secs}s`
	return `${mins}m ${secs}s`
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))

	if (days === 0) {
		return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
	}
	if (days === 1) {
		return `Yesterday ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
	}
	if (days < 7) {
		return date.toLocaleDateString([], { weekday: "short", hour: "numeric", minute: "2-digit" })
	}
	return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function CallStatusBadge({ status }: { status: string }) {
	switch (status) {
		case "connected":
		case "ended":
			return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">Completed</Badge>
		case "missed":
			return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800">Missed</Badge>
		case "declined":
			return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">Declined</Badge>
		case "ringing":
			return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">Ringing</Badge>
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

export default function CallsPage() {
	const [calls, setCalls] = useState<CallHistoryItem[]>([])
	const [loading, setLoading] = useState(true)
	const call = useCall()

	useEffect(() => {
		getCallHistory().then((data) => {
			setCalls(data)
			setLoading(false)
		})
	}, [])

	const handleCallBack = async (participantIds: string[], type: "voice" | "video") => {
		if (call.status !== "idle") return
		await call.startCall(participantIds, type)
	}

	if (loading) {
		return (
			<div className="flex-1 p-6">
				<div>
					<p className="text-sm text-muted-foreground mb-6">View and manage your call history.</p>
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 p-6">
			<div>
				<p className="text-sm text-muted-foreground mb-6">View and manage your call history.</p>

				{calls.length === 0 ? (
					<div className="text-center py-12">
						<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
							<HugeiconsIcon icon={Call02Icon} size={24} className="text-muted-foreground" />
						</div>
						<h3 className="font-medium mb-1">No calls yet</h3>
						<p className="text-sm text-muted-foreground">
							Start a call from any chat conversation
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{calls.map((c) => {
							const isOutgoing = c.isInitiator
							const otherParticipants = c.participants.filter((p) => !p.isInitiator)
							const displayName = c.isGroup
								? c.chatChannel
									? `#${c.chatChannel}`
									: `Group call (${c.participants.length})`
								: otherParticipants[0]?.name || "Unknown"
							const displayImage = !c.isGroup ? otherParticipants[0]?.image : null

							return (
								<div
									key={c.id}
									className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
								>
									{/* Direction icon */}
									<div className={`shrink-0 ${isOutgoing ? "text-blue-500" : "text-green-500"}`}>
										<HugeiconsIcon
											icon={isOutgoing ? ArrowRight01Icon : ArrowLeft01Icon}
											size={16}
										/>
									</div>

									{/* Avatar */}
									<Avatar className="h-8 w-8 shrink-0">
										{displayImage && <AvatarImage src={displayImage} alt={displayName} />}
										<AvatarFallback>
											{c.isGroup ? "#" : getInitials(displayName)}
										</AvatarFallback>
									</Avatar>

									{/* Call info */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-medium truncate">{displayName}</span>
											{c.isGroup && (
												<span className="text-xs text-muted-foreground">
													({c.participants.length} participants)
												</span>
											)}
										</div>
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<HugeiconsIcon
												icon={c.type === "video" ? Video01Icon : Call02Icon}
												size={14}
											/>
											<span>{c.type === "video" ? "Video" : "Voice"}</span>
											<span>·</span>
											<span>{formatDate(c.startedAt)}</span>
											{c.durationSeconds && (
												<>
													<span>·</span>
													<span>{formatDuration(c.durationSeconds)}</span>
												</>
											)}
										</div>
									</div>

									{/* Status */}
									<CallStatusBadge status={c.status} />

									{/* Call back button */}
									{(c.status === "ended" || c.status === "missed" || c.status === "declined") && (
										<Button
											variant="ghost"
											size="icon"
											className="shrink-0"
											onClick={() => handleCallBack(
												otherParticipants.map((p) => p.id),
												c.type as "voice" | "video"
											)}
											disabled={call.status !== "idle"}
										>
											<HugeiconsIcon
												icon={c.type === "video" ? Video01Icon : Call02Icon}
												size={16}
											/>
											<span className="sr-only">Call back</span>
										</Button>
									)}
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
