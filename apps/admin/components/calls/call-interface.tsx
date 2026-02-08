"use client"

import { useEffect, useRef, useState } from "react"
import { useCall } from "./call-provider"
import { CallControls } from "./call-controls"
import { ParticipantGrid } from "./participant-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowShrinkIcon, ArrowExpandIcon, SentIcon } from "@hugeicons/core-free-icons"
// ConnectionState string values matching livekit-client
const ConnectionState = { Connected: "connected" } as const
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { usePusher } from "@/components/pusher-provider"
import {
	getOrCreateConversation,
	getDirectMessages,
	sendDirectMessage,
} from "@/app/(dashboard)/discover/actions"
import { sendTeamMessage } from "@/app/(dashboard)/messages/actions"
import type { Participant } from "@/hooks/use-livekit-room"

// Hidden audio renderer — keeps remote audio playing even in minimized/floating views
function RemoteAudioRenderer({ participants }: { participants: Participant[] }) {
	const remoteParticipants = participants.filter((p) => !p.isLocal)

	return (
		<div className="hidden">
			{remoteParticipants.map((p) => (
				<RemoteAudio key={p.identity} participant={p} />
			))}
		</div>
	)
}

function RemoteAudio({ participant }: { participant: Participant }) {
	const audioRef = useRef<HTMLAudioElement>(null)
	// Keep a ref to the current track so the cleanup can access it even after re-render
	const trackRef = useRef(participant.audioTrack)
	trackRef.current = participant.audioTrack

	// Use audioTrackSid as dependency — stable identifier that doesn't change on re-renders
	useEffect(() => {
		const audioEl = audioRef.current
		const audioTrack = trackRef.current
		if (!audioTrack || !audioEl) return

		try {
			audioTrack.attach(audioEl)
		} catch (err) {
			console.error("[RemoteAudio] Failed to attach audio:", err)
		}

		return () => {
			try {
				audioTrack.detach(audioEl)
			} catch {}
		}
	}, [participant.identity, participant.audioTrackSid])

	return <audio ref={audioRef} autoPlay />
}

// Self-preview component for connecting state
function SelfPreview({ className, videoEnabled }: { className?: string; videoEnabled: boolean }) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const streamRef = useRef<MediaStream | null>(null)

	useEffect(() => {
		async function startPreview() {
			if (!videoEnabled) {
				// Stop existing stream if video disabled
				if (streamRef.current) {
					streamRef.current.getTracks().forEach((track) => track.stop())
					streamRef.current = null
				}
				if (videoRef.current) {
					videoRef.current.srcObject = null
				}
				return
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				})
				streamRef.current = stream
				if (videoRef.current) {
					videoRef.current.srcObject = stream
				}
			} catch (err) {
				console.error("Failed to get camera preview:", err)
			}
		}

		startPreview()

		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop())
			}
		}
	}, [videoEnabled])

	return (
		<div className={cn("relative size-full bg-muted", className)}>
			{videoEnabled ? (
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className="size-full object-cover"
					style={{ transform: "scaleX(-1)" }}
				/>
			) : (
				<div className="size-full flex items-center justify-center">
					<div className="size-20 rounded-full bg-muted-foreground/20 flex items-center justify-center">
						<span className="text-2xl text-muted-foreground">You</span>
					</div>
				</div>
			)}
			{/* Connecting overlay */}
			<div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
				<div className="animate-spin rounded-full size-4 border-2 border-white border-t-transparent" />
				<p className="text-sm text-white font-medium">Connecting...</p>
			</div>
		</div>
	)
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Duration indicator badge
function DurationBadge({ duration, participantCount }: { duration: number; participantCount: number }) {
	return (
		<div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
			<span className="relative flex size-2">
				<span className="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75" />
				<span className="relative inline-flex size-2 rounded-full bg-green-500" />
			</span>
			<span className="text-sm font-medium text-white">{formatDuration(duration)}</span>
			<span className="text-sm text-white/70">&bull; {participantCount}</span>
		</div>
	)
}

// Embedded chat panel for fullscreen + chat mode
type ChatMessage = {
	id: string
	senderId: string
	senderName: string | null
	senderImage: string | null
	body: string | null
	createdAt: string | Date
}

function EmbeddedChat({ participants }: { participants: { identity: string; name: string; isLocal: boolean }[] }) {
	const { chatChannel } = useCall()
	const { pusher } = usePusher()
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [input, setInput] = useState("")
	const [sending, setSending] = useState(false)
	const [conversationId, setConversationId] = useState<string | null>(null)
	const [chatType, setChatType] = useState<"dm" | "team" | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)

	// Resolve conversation from participants
	useEffect(() => {
		async function resolveChat() {
			const remoteParticipant = participants.find((p) => !p.isLocal)
			if (!remoteParticipant) return

			// For 1-on-1 calls, use DM conversation
			if (participants.length === 2) {
				try {
					const conv = await getOrCreateConversation(remoteParticipant.identity)
					setConversationId(conv.id)
					setChatType("dm")

					// Load messages
					const msgs = await getDirectMessages(conv.id, 50)
					setMessages(msgs.map((m) => ({
						id: m.id,
						senderId: m.senderId,
						senderName: m.senderName,
						senderImage: m.senderImage,
						body: m.body,
						createdAt: m.createdAt,
					})))
				} catch {
					// Fall back to team chat
					setChatType("team")
				}
			} else {
				// Group calls use team messages
				setChatType("team")
				if (chatChannel) {
					setChatType("team")
				}
			}
		}

		resolveChat()
	}, [participants, chatChannel])

	// Subscribe to real-time DM messages
	useEffect(() => {
		if (!pusher || !conversationId || chatType !== "dm") return

		const localParticipant = participants.find((p) => p.isLocal)
		if (!localParticipant) return

		const channel = pusher.channel(`private-user-${localParticipant.identity}`)
		if (!channel) return

		const handleDm = (data: { conversationId: string; message: ChatMessage }) => {
			if (data.conversationId === conversationId) {
				setMessages((prev) => [...prev, data.message])
			}
		}

		channel.bind("dm-received", handleDm)
		return () => {
			channel.unbind("dm-received", handleDm)
		}
	}, [pusher, conversationId, chatType, participants])

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages])

	const handleSend = async () => {
		const text = input.trim()
		if (!text || sending) return

		setSending(true)
		setInput("")

		try {
			if (chatType === "dm" && conversationId) {
				const result = await sendDirectMessage(conversationId, text)
				// Add our own message locally
				setMessages((prev) => [...prev, {
					id: result.id,
					senderId: result.senderId,
					senderName: result.senderName || null,
					senderImage: result.senderImage || null,
					body: text,
					createdAt: new Date().toISOString(),
				}])
			} else if (chatType === "team") {
				const remoteIds = participants.filter((p) => !p.isLocal).map((p) => p.identity)
				await sendTeamMessage({
					body: text,
					channel: chatChannel || "call",
					recipientIds: remoteIds,
				})
			}
		} catch {
			// Restore input on error
			setInput(text)
		} finally {
			setSending(false)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="flex flex-col h-full bg-background/95 backdrop-blur-sm">
			{/* Chat header */}
			<div className="px-4 py-2 border-b border-border/50">
				<span className="text-sm font-medium text-white/80">Chat</span>
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
				{messages.length === 0 && (
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-muted-foreground">No messages yet</p>
					</div>
				)}
				{messages.map((msg) => {
					const isLocal = participants.find((p) => p.isLocal)?.identity === msg.senderId
					return (
						<div key={msg.id} className={cn("flex gap-2", isLocal && "flex-row-reverse")}>
							<Avatar className="size-6 shrink-0">
								{msg.senderImage && <AvatarImage src={msg.senderImage} />}
								<AvatarFallback className="text-[10px]">
									{(msg.senderName || "?").charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className={cn(
								"max-w-[80%] rounded-lg px-3 py-1.5 text-sm",
								isLocal ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
							)}>
								{msg.body}
							</div>
						</div>
					)
				})}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="p-3 border-t border-border/50">
				<div className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						className="flex-1 bg-muted/50 border-border/50 text-white placeholder:text-white/40"
						disabled={sending}
					/>
					<Button
						size="icon"
						className="shrink-0"
						onClick={handleSend}
						disabled={!input.trim() || sending}
					>
						<HugeiconsIcon icon={SentIcon} size={16} />
					</Button>
				</div>
			</div>
		</div>
	)
}

export function CallInterface() {
	const {
		status,
		participants,
		dominantSpeaker,
		connectionState,
		callDuration,
		viewMode,
		showChat,
		localVideoEnabled,
		setViewMode,
	} = useCall()

	// Only show when in a call (connecting or connected)
	if (status !== "connecting" && status !== "connected") {
		return null
	}

	const isConnecting = connectionState !== ConnectionState.Connected
	const remoteParticipants = participants.filter((p) => !p.isLocal)

	// RemoteAudioRenderer is ALWAYS rendered to keep audio playing across all view modes.
	// ParticipantTile only handles video — audio lives here exclusively to prevent
	// duplicate attachments that cause crackling/static over long calls.

	// Minimized view (just a small pill)
	if (viewMode === "minimized") {
		return (
			<>
				<RemoteAudioRenderer participants={participants} />
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					className="fixed bottom-4 right-4 z-50"
				>
					<Button
						onClick={() => setViewMode("floating")}
						className="rounded-full px-4 py-2 bg-primary shadow-lg"
					>
						<span className="flex items-center gap-2">
							<span className="relative flex size-2">
								<span className="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75" />
								<span className="relative inline-flex size-2 rounded-full bg-green-500" />
							</span>
							<span>{formatDuration(callDuration)}</span>
							<span className="text-muted-foreground">&bull; {participants.length}</span>
						</span>
					</Button>
				</motion.div>
			</>
		)
	}

	// Fullscreen view (with optional chat panel)
	if (viewMode === "fullscreen") {
		return (
			<>
			<RemoteAudioRenderer participants={participants} />
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-50 bg-black"
			>
				<div className={cn(
					"size-full flex",
					// Desktop: side by side when chat is open
					// Mobile: stacked when chat is open
					showChat ? "flex-col md:flex-row" : "flex-col"
				)}>
					{/* Video area */}
					<div className={cn(
						"relative",
						showChat ? "h-[60%] md:h-full md:flex-1" : "size-full"
					)}>
						{isConnecting ? (
							<SelfPreview className="size-full" videoEnabled={localVideoEnabled} />
						) : (
							<ParticipantGrid
								participants={participants}
								dominantSpeaker={dominantSpeaker}
								className="size-full"
								hideLocal={showChat}
							/>
						)}

						{/* Top overlay - duration */}
						<div className="absolute top-4 left-4 z-10">
							<DurationBadge duration={callDuration} participantCount={participants.length} />
						</div>

						{/* Bottom overlay - controls */}
						<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
							<div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-3">
								<CallControls variant="fullscreen" className="justify-center" />
							</div>
						</div>
					</div>

					{/* Chat panel (when showChat is true) */}
					{showChat && (
						<div className={cn(
							"border-border/30",
							// Desktop: right sidebar, Mobile: bottom panel
							"h-[40%] md:h-full md:w-90 border-t md:border-t-0 md:border-l"
						)}>
							<EmbeddedChat participants={participants} />
						</div>
					)}
				</div>
			</motion.div>
			</>
		)
	}

	// Floating view (PiP style) — only show remote participant(s)
	return (
		<>
		<RemoteAudioRenderer participants={participants} />
		<AnimatePresence>
			<motion.div
				initial={{ scale: 0.8, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.8, opacity: 0, y: 20 }}
				drag
				dragMomentum={false}
				className={cn(
					"fixed bottom-4 right-4 z-50",
					"w-80 rounded-xl overflow-hidden",
					"bg-card border shadow-2xl"
				)}
			>
				{/* Header bar */}
				<div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b cursor-move">
					<div className="flex items-center gap-2 text-sm">
						<span className="relative flex size-2">
							<span className="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-green-500" />
						</span>
						<span className="font-medium">{formatDuration(callDuration)}</span>
					</div>

					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="size-7" onClick={() => setViewMode("fullscreen")}>
							<HugeiconsIcon icon={ArrowExpandIcon} size={14} />
						</Button>
						<Button variant="ghost" size="icon" className="size-7" onClick={() => setViewMode("minimized")}>
							<HugeiconsIcon icon={ArrowShrinkIcon} size={14} />
						</Button>
					</div>
				</div>

				{/* Video area — only remote participants */}
				<div className="aspect-video bg-muted">
					{isConnecting ? (
						<SelfPreview videoEnabled={localVideoEnabled} />
					) : remoteParticipants.length > 0 ? (
						<ParticipantGrid
							participants={remoteParticipants}
							dominantSpeaker={dominantSpeaker}
							className="size-full"
						/>
					) : (
						<div className="size-full flex items-center justify-center">
							<p className="text-sm text-muted-foreground">Waiting for others...</p>
						</div>
					)}
				</div>

				{/* Controls */}
				<div className="p-2 border-t">
					<CallControls variant="floating" />
				</div>
			</motion.div>
		</AnimatePresence>
		</>
	)
}
