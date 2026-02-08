"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image02Icon, Cancel01Icon, Link04Icon, Call02Icon, Video02Icon, CallMissed01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { usePusher } from "@/components/pusher-provider"
import { useChat } from "@/components/messages"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sendTeamMessage, markMessageRead, getMessageReadStatus, getTeamMessages, uploadChatImage, fetchLinkPreview } from "./actions"
import type { TeamMessage, MessageAttachment, CallMessageData } from "./types"

// URL regex for detecting links in messages
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g

// Parse message body and convert URLs to clickable links
function MessageBody({ body, className }: { body: string | null; className?: string }) {
	if (!body) return null
	const parts = body.split(URL_REGEX)
	return (
		<span className={className}>
			{parts.map((part, i) => {
				if (URL_REGEX.test(part)) {
					URL_REGEX.lastIndex = 0 // Reset regex state
					return (
						<a
							key={i}
							href={part}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:underline break-all"
							onClick={(e) => e.stopPropagation()}
						>
							{part}
						</a>
					)
				}
				return part
			})}
		</span>
	)
}

// Link preview component
function LinkPreview({ url }: { url: string }) {
	const [preview, setPreview] = useState<{
		title?: string
		description?: string
		image?: string
		favicon?: string
		siteName?: string
	} | null>(null)
	const [loading, setLoading] = useState(true)
	const [imageError, setImageError] = useState(false)

	useEffect(() => {
		let cancelled = false
		setImageError(false)
		fetchLinkPreview(url).then((data) => {
			if (!cancelled) {
				setPreview(data)
				setLoading(false)
			}
		}).catch(() => {
			if (!cancelled) setLoading(false)
		})
		return () => { cancelled = true }
	}, [url])

	if (loading || !preview || (!preview.title && !preview.image)) return null

	const hostname = (() => {
		try {
			return new URL(url).hostname.replace(/^www\./, "")
		} catch {
			return url
		}
	})()

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="mt-2 block rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors max-w-sm overflow-hidden"
		>
			{/* OG Image on top */}
			{preview.image && !imageError && (
				<div className="w-full aspect-[1.91/1] bg-muted">
					<img
						src={preview.image}
						alt=""
						className="w-full h-full object-cover"
						onError={() => setImageError(true)}
					/>
				</div>
			)}
			{/* Content */}
			<div className="p-3">
				{preview.title && (
					<p className="text-sm font-medium line-clamp-2">{preview.title}</p>
				)}
				{preview.description && (
					<p className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview.description}</p>
				)}
				{/* Footer with favicon and hostname */}
				<div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
					{preview.favicon ? (
						<img
							src={preview.favicon}
							alt=""
							className="w-4 h-4 rounded-sm shrink-0"
							onError={(e) => { e.currentTarget.style.display = "none" }}
						/>
					) : (
						<div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center shrink-0">
							<HugeiconsIcon icon={Link04Icon} size={10} className="text-muted-foreground" />
						</div>
					)}
					<span className="text-[11px] text-muted-foreground truncate">
						{preview.siteName || hostname}
					</span>
				</div>
			</div>
		</a>
	)
}

// Check if message is only a URL (no other text)
function isOnlyUrl(body: string): boolean {
	const trimmed = body.trim()
	return URL_REGEX.test(trimmed) && trimmed.replace(URL_REGEX, "").trim() === ""
}

// Extract first URL from message body
function getFirstUrl(body: string): string | null {
	const match = body.match(URL_REGEX)
	return match ? match[0] : null
}

// Call message component - Snapchat-style call event in chat
function CallMessage({ callData, body, isOwn, senderName, createdAt }: {
	callData: TeamMessage["callData"]
	body: string | null
	isOwn: boolean
	senderName: string
	createdAt: string
}) {
	if (!callData) return null

	const isMissed = callData.callStatus === "missed"
	const isDeclined = callData.callStatus === "declined"
	const isEnded = callData.callStatus === "ended"
	const isVideo = callData.callType === "video"

	// Choose icon based on status
	const Icon = isMissed ? CallMissed01Icon : isVideo ? Video02Icon : Call02Icon

	// Color based on status
	const statusColor = isMissed || isDeclined
		? "text-red-500"
		: isEnded
		? "text-green-500"
		: "text-primary"

	const bgColor = isMissed || isDeclined
		? "bg-red-500/10"
		: isEnded
		? "bg-green-500/10"
		: "bg-primary/10"

	return (
		<div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${bgColor} ${isOwn ? "ml-auto" : "mr-auto"} max-w-[280px]`}>
			<div className={`p-2 rounded-full ${bgColor}`}>
				<HugeiconsIcon icon={Icon} size={20} className={statusColor} />
			</div>
			<div className="flex flex-col">
				<span className="text-sm font-medium">{body}</span>
				<span className="text-xs text-muted-foreground">
					{isOwn ? "You" : senderName.split(" ")[0]} · {timeAgo(createdAt)}
				</span>
			</div>
		</div>
	)
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return "now"
	if (mins < 60) return `${mins}m`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h`
	const days = Math.floor(hrs / 24)
	if (days < 7) return `${days}d`
	return new Date(dateStr).toLocaleDateString("en-US")
}


export function ChatTab({
	userId,
	userName,
	userImage,
	onTabChange,
}: {
	userId: string
	userName: string
	userImage: string | null
	onTabChange?: (tab: "chat" | "inbox" | "friends") => void
}) {
	const { active, setActive, messages, setMessages, teamMembers, userId: chatUserId } = useChat()
	const [body, setBody] = useState("")
	const [sending, setSending] = useState(false)
	const [readReceipts, setReadReceipts] = useState<Record<string, {
		allRead: boolean
		readCount: number
		totalRecipients: number
		readBy: { name: string | null; readAt: Date | null }[]
	}>>({})
	const [highlightedId, setHighlightedId] = useState<string | null>(null)
	const [isAtBottom, setIsAtBottom] = useState(true)
	const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([])
	const [isDragOver, setIsDragOver] = useState(false)
	const [uploadingImage, setUploadingImage] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const activeRef = useRef(active) // Ref for stable handler access
	activeRef.current = active // Keep ref updated
	const { pusher } = usePusher()
	const searchParams = useSearchParams()

	// Function to highlight a message - refetches from DB if message not found
	const highlightMessage = useCallback(async (messageId: string, channel: string) => {
		// Check if message exists in current state
		let msg = messages.find(m => m.id === messageId)

		// If not found, refetch messages from database
		if (!msg) {
			try {
				const freshMessages = await getTeamMessages(userId)
				const formattedMessages = freshMessages.map((m) => ({
					...m,
					contentType: m.contentType as "text" | "markdown" | "call" | undefined,
					callData: m.callData ?? undefined,
					attachments: m.attachments || undefined,
					createdAt: m.createdAt.toISOString(),
					readAt: m.readAt?.toISOString() || null,
				}))
				setMessages(formattedMessages)
				msg = formattedMessages.find(m => m.id === messageId)
			} catch {
				// Ignore fetch errors, continue with highlight attempt
			}
		}

		setHighlightedId(messageId)

		// Switch to the correct channel/conversation
		if (channel && channel !== active.id) {
			if (channel === "dm") {
				if (msg && msg.senderId) {
					const otherId = msg.senderId === userId ? active.id : msg.senderId
					const member = teamMembers.find(m => m.id === otherId)
					if (member) {
						setActive({ type: "dm", id: otherId, label: member.name })
					}
				}
			} else {
				setActive({ type: "channel", id: channel, label: `#${channel}` })
			}
		}

		// Scroll to the message after a short delay (give time for state update)
		setTimeout(() => {
			const el = document.querySelector(`[data-message-id="${messageId}"]`)
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" })
			}
		}, 150)

		// Clear highlight after animation
		setTimeout(() => setHighlightedId(null), 2000)

		// Clear URL params
		window.history.replaceState({}, "", "/notifications/messages")
	}, [active.id, messages, userId, teamMembers])

	// Listen for custom highlight event (from header popover)
	useEffect(() => {
		const handleHighlight = (e: CustomEvent<{ messageId: string; channel: string }>) => {
			highlightMessage(e.detail.messageId, e.detail.channel)
		}
		window.addEventListener("highlight-message", handleHighlight as EventListener)
		return () => window.removeEventListener("highlight-message", handleHighlight as EventListener)
	}, [highlightMessage])

	// Handle URL params for highlighting specific message
	useEffect(() => {
		const highlightId = searchParams.get("highlight")
		const channel = searchParams.get("channel")

		if (highlightId && channel) {
			highlightMessage(highlightId, channel)
		}
	}, [searchParams, highlightMessage])

	// Track if user is at bottom of messages
	const handleScroll = useCallback(() => {
		const container = messagesContainerRef.current
		if (!container) return
		const threshold = 100 // pixels from bottom
		const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
		setIsAtBottom(atBottom)
	}, [])

	// Fetch read receipts for messages sent by current user
	useEffect(() => {
		async function fetchReadReceipts() {
			const sentMessages = messages.filter(m => m.senderId === userId && !m.id.startsWith("optimistic-"))
			const receipts: typeof readReceipts = {}

			for (const msg of sentMessages) {
				try {
					const status = await getMessageReadStatus(msg.id, userId)
					receipts[msg.id] = status
				} catch {
					// Ignore errors for individual messages
				}
			}
			setReadReceipts(receipts)
		}

		fetchReadReceipts()
		// Re-fetch every 10 seconds for updates
		const interval = setInterval(fetchReadReceipts, 10000)
		return () => clearInterval(interval)
	}, [messages, userId])

	// Real-time: receive messages from others via Pusher WebSocket
	useEffect(() => {
		if (!pusher || !userId) return

		const channelName = `private-user-${userId}`
		console.log(`[Chat] Subscribing to ${channelName}`)

		const ch = pusher.subscribe(channelName)

		// Handle subscription success
		ch.bind("pusher:subscription_succeeded", () => {
			console.log(`[Chat] Successfully subscribed to ${channelName}`)
		})

		// Handle subscription error
		ch.bind("pusher:subscription_error", (error: { type: string; error: string; status: number }) => {
			console.error(`[Chat] Subscription error for ${channelName}:`, error)
		})

		const handleNewMessage = (data: TeamMessage) => {
			console.log("[Chat] Received new message:", data.id, "from:", data.senderId)

			// Don't process our own messages (they're added optimistically)
			if (data.senderId === userId) {
				console.log("[Chat] Ignoring own message")
				return
			}

			setMessages((prev) => {
				// Avoid duplicates
				if (prev.some((m) => m.id === data.id)) {
					console.log("[Chat] Duplicate message, skipping:", data.id)
					return prev
				}
				return [...prev, data]
			})

			// Play notification sound if message is from different conversation
			// Use ref to get current active without causing re-subscription
			const currentActive = activeRef.current
			const isFromCurrentConversation =
				(currentActive.type === "channel" && data.channel === currentActive.id) ||
				(currentActive.type === "dm" && data.channel === "dm" && data.senderId === currentActive.id)

			if (!isFromCurrentConversation) {
				const audio = new Audio("/sounds/message.mp3")
				audio.volume = 0.5
				audio.play().catch(() => {})
			}
		}

		// Real-time read receipts
		const handleMessageRead = (data: { messageId: string; readBy: string; readAt: string }) => {
			console.log("[Chat] Message read event:", data.messageId)
			setReadReceipts((prev) => {
				const existing = prev[data.messageId]
				if (!existing) {
					// Fetch fresh data for this message
					getMessageReadStatus(data.messageId, userId).then((status) => {
						setReadReceipts((p) => ({ ...p, [data.messageId]: status }))
					})
					return prev
				}
				// Update existing receipt
				return {
					...prev,
					[data.messageId]: {
						...existing,
						readCount: existing.readCount + 1,
						allRead: existing.readCount + 1 >= existing.totalRecipients,
						readBy: [...existing.readBy, { name: data.readBy, readAt: new Date(data.readAt) }],
					},
				}
			})
		}

		ch.bind("new-message", handleNewMessage)
		ch.bind("message-read", handleMessageRead)

		return () => {
			console.log(`[Chat] Unbinding handlers for ${channelName}`)
			// Only unbind our specific handlers, don't unsubscribe the channel
			// HeaderToolbar also uses this channel for notifications
			ch.unbind("new-message", handleNewMessage)
			ch.unbind("message-read", handleMessageRead)
			ch.unbind("pusher:subscription_succeeded")
			ch.unbind("pusher:subscription_error")
		}
		// Note: active is accessed via activeRef to avoid re-subscription on conversation switch
	}, [pusher, userId])

	// Auto-scroll to bottom only if user is already at bottom
	useEffect(() => {
		if (isAtBottom) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
		}
	}, [messages, isAtBottom])

	// Scroll to bottom when switching conversations
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
		setIsAtBottom(true)
	}, [active])

	const filteredMessages = messages.filter((m) => {
		if (active.type === "channel") return m.channel === active.id
		return m.channel === "dm" && (m.senderId === active.id || m.senderId === userId)
	})

	async function handleImageUpload(file: File) {
		if (!file.type.startsWith("image/")) {
			toast.error("Only image files are allowed")
			return
		}
		if (file.size > 10 * 1024 * 1024) {
			toast.error("Image too large (max 10MB)")
			return
		}

		setUploadingImage(true)
		try {
			const formData = new FormData()
			formData.append("file", file)
			const attachment = await uploadChatImage(formData)
			setPendingAttachments((prev) => [...prev, attachment])
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to upload image")
		} finally {
			setUploadingImage(false)
		}
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault()
		setIsDragOver(true)
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault()
		setIsDragOver(false)
	}

	async function handleDrop(e: React.DragEvent) {
		e.preventDefault()
		setIsDragOver(false)

		const files = Array.from(e.dataTransfer.files)
		const imageFiles = files.filter((f) => f.type.startsWith("image/"))

		for (const file of imageFiles) {
			await handleImageUpload(file)
		}
	}

	async function handleSend() {
		if (!body.trim() && pendingAttachments.length === 0) return
		const messageBody = body.trim()
		const attachments = [...pendingAttachments]
		setBody("")
		setPendingAttachments([])
		setSending(true)

		// Optimistic: add message to local state immediately
		const optimisticId = `optimistic-${Date.now()}`
		const channel = active.type === "channel" ? active.id : "dm"
		const optimisticMessage: TeamMessage = {
			id: optimisticId,
			senderId: userId,
			senderName: userName,
			senderImage: userImage,
			channel,
			body: messageBody,
			attachments,
			createdAt: new Date().toISOString(),
			readAt: new Date().toISOString(),
		}
		setMessages((prev) => [...prev, optimisticMessage])

		try {
			const recipientIds = active.type === "dm" ? [active.id] : undefined
			const realMessage = await sendTeamMessage({ body: messageBody, channel, recipientIds, attachments })
			// Replace optimistic message with real one from database
			const createdAt = typeof realMessage.createdAt === "string"
				? realMessage.createdAt
				: realMessage.createdAt.toISOString()
			setMessages((prev) => prev.map((m) =>
				m.id === optimisticId
					? { ...m, id: realMessage.id, createdAt }
					: m
			))
		} catch {
			// Remove optimistic message on failure
			setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
			toast.error("Failed to send message")
		} finally {
			setSending(false)
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}


	// Mark message as read when it scrolls into view
	const observerRef = useRef<IntersectionObserver | null>(null)
	const observedMessages = useRef<Set<string>>(new Set())

	useEffect(() => {
		observerRef.current = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const messageId = entry.target.getAttribute("data-message-id")
						if (messageId && !observedMessages.current.has(messageId)) {
							observedMessages.current.add(messageId)
							const msg = messages.find(m => m.id === messageId)
							if (msg && !msg.readAt && msg.senderId !== userId) {
								markMessageRead(messageId)
								// Update local state
								setMessages(prev => prev.map(m =>
									m.id === messageId ? { ...m, readAt: new Date().toISOString() } : m
								))
							}
						}
					}
				}
			},
			{ threshold: 0.5 }
		)

		return () => {
			observerRef.current?.disconnect()
		}
	}, [messages, userId])

	// Callback ref for observing message elements
	const observeMessage = (el: HTMLDivElement | null, messageId: string, isUnread: boolean) => {
		if (el && isUnread && observerRef.current) {
			el.setAttribute("data-message-id", messageId)
			observerRef.current.observe(el)
		}
	}

	const placeholder = active.type === "channel"
		? `Message #${active.id}...`
		: `Message ${active.label}...`

	return (
		<div className="relative h-[calc(100svh-4rem)] overflow-hidden">
			{/* Header with tab toggle */}
			{onTabChange && (
				<div className="absolute top-0 left-0 right-0 h-12 border-b px-4 flex items-center justify-between bg-background z-10">
					<span className="text-sm font-medium">Team Chat</span>
					<Tabs value="chat" onValueChange={(v) => onTabChange(v as "chat" | "inbox" | "friends")}>
						<TabsList className="h-8">
							<TabsTrigger value="chat" className="text-xs px-3 h-6">Team</TabsTrigger>
							<TabsTrigger value="friends" className="text-xs px-3 h-6">Friends</TabsTrigger>
							<TabsTrigger value="inbox" className="text-xs px-3 h-6">Inbox</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			)}
			{/* Messages - only this section scrolls */}
			<div
				ref={messagesContainerRef}
				onScroll={handleScroll}
				className={`absolute inset-0 ${onTabChange ? "top-12" : ""} bottom-[88px] overflow-y-auto p-4 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
			>
				{filteredMessages.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<p className="text-sm text-muted-foreground">No messages yet</p>
							<p className="text-xs text-muted-foreground/60 mt-1">
								Start the conversation.
							</p>
						</div>
					</div>
				) : (
					filteredMessages.map((msg, idx) => {
						const isOwn = msg.senderId === userId
						const receipt = isOwn ? readReceipts[msg.id] : null
						const isLastOwnMessage = isOwn && filteredMessages.slice(idx + 1).every(m => m.senderId !== userId)

						// Determine read status text
						let readStatus = null
						if (isOwn && receipt && isLastOwnMessage) {
							if (active.type === "dm") {
								// DM: show "Read" when recipient read it
								if (receipt.allRead) {
									readStatus = "Read"
								}
							} else {
								// Channel: show "Read by all" or nothing
								if (receipt.allRead && receipt.totalRecipients > 0) {
									readStatus = "Read by all"
								} else if (receipt.readCount > 0) {
									readStatus = `Read by ${receipt.readCount}`
								}
							}
						}

						const isUnread = !isOwn && !msg.readAt
						const isHighlighted = msg.id === highlightedId

						// Render call messages with special styling
						if (msg.contentType === "call" && msg.callData) {
							return (
								<div
									key={msg.id}
									ref={(el) => observeMessage(el, msg.id, isUnread)}
									data-message-id={msg.id}
									className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isHighlighted ? "animate-[pulse-highlight_0.6s_ease-out] relative z-[9999]" : ""}`}
								>
									<CallMessage
										callData={msg.callData}
										body={msg.body}
										isOwn={isOwn}
										senderName={msg.senderName}
										createdAt={msg.createdAt}
									/>
								</div>
							)
						}

						return (
							<div
								key={msg.id}
								ref={(el) => observeMessage(el, msg.id, isUnread)}
								data-message-id={msg.id}
								className={`group flex gap-2.5 items-start rounded-lg ${isOwn ? "flex-row-reverse" : ""} ${isHighlighted ? "animate-[pulse-highlight_0.6s_ease-out] relative z-[9999]" : ""}`}
							>
								<Avatar className="h-9 w-9 shrink-0">
									{msg.senderImage && <AvatarImage src={msg.senderImage} alt={msg.senderName} />}
									<AvatarFallback className="text-xs">{getInitials(msg.senderName)}</AvatarFallback>
								</Avatar>
								<div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
									{/* Attachments (images) */}
									{msg.attachments && msg.attachments.length > 0 && (
										<div className={`flex flex-wrap gap-2 mb-2 ${isOwn ? "justify-end" : "justify-start"}`}>
											{msg.attachments.map((att, attIdx) => (
												<a
													key={attIdx}
													href={att.url}
													target="_blank"
													rel="noopener noreferrer"
													className="block"
												>
													<img
														src={att.url}
														alt={att.name}
														className="max-w-[200px] max-h-[200px] rounded-lg object-cover border hover:opacity-90 transition-opacity"
													/>
												</a>
											))}
										</div>
									)}
									{/* Message bubble - hide if message is only a URL (link preview will show instead) */}
									{msg.body && !isOnlyUrl(msg.body) && (
										<div className={`flex items-end gap-1 ${isOwn ? "flex-row-reverse" : ""}`}>
											<div className={`px-3 py-2 text-sm whitespace-pre-wrap break-words ${
												isOwn
													? "bg-primary text-primary-foreground rounded-lg rounded-br-sm"
													: "bg-muted rounded-lg rounded-bl-sm"
											}`}>
												<MessageBody body={msg.body} />
											</div>
											<button
												type="button"
												onClick={() => {
													navigator.clipboard.writeText(msg.body || "")
													toast.success("Copied to clipboard")
												}}
												className="opacity-0 group-hover:opacity-100 transition-opacity mb-0.5"
												title="Copy message"
											>
												<svg className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
													<rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
													<path d="M3 10V3.5A1.5 1.5 0 0 1 4.5 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
												</svg>
											</button>
										</div>
									)}
									{/* Link preview */}
									{msg.body && getFirstUrl(msg.body) && (
										<LinkPreview url={getFirstUrl(msg.body)!} />
									)}
									<div className={`flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground ${isOwn ? "flex-row-reverse" : ""}`}>
										<span className="font-medium">{isOwn ? "You" : msg.senderName.split(" ")[0]}</span>
										<span className="text-muted-foreground/50">·</span>
										<span>{timeAgo(msg.createdAt)}</span>
										{readStatus && (
											<>
												<span className="text-muted-foreground/50">·</span>
												<span className="flex items-center gap-0.5">
													<svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M2 8.5l3.5 3.5L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
													</svg>
													{readStatus}
												</span>
											</>
										)}
									</div>
								</div>
							</div>
						)
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input bar - fixed at bottom */}
			<div
				className={`absolute bottom-0 left-0 right-0 p-4 bg-background ${isDragOver ? "bg-primary/5" : ""}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{/* Pending attachments preview */}
				{pendingAttachments.length > 0 && (
					<div className="flex flex-wrap gap-2 mb-3">
						{pendingAttachments.map((att, idx) => (
							<div key={idx} className="relative group">
								<img
									src={att.url}
									alt={att.name}
									className="w-16 h-16 rounded-lg object-cover border"
								/>
								<button
									type="button"
									onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
									className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<HugeiconsIcon icon={Cancel01Icon} size={12} />
								</button>
							</div>
						))}
					</div>
				)}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					multiple
					className="hidden"
					onChange={(e) => {
						const files = Array.from(e.target.files || [])
						files.forEach((file) => handleImageUpload(file))
						e.target.value = ""
					}}
				/>
				{/* Combined input bar with buttons inside */}
				<div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploadingImage}
						className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
					>
						<HugeiconsIcon icon={Image02Icon} size={20} />
					</button>
					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={isDragOver ? "Drop images here..." : placeholder}
						className="flex-1 bg-transparent border-0 resize-none text-sm min-h-[24px] max-h-32 py-1 focus:outline-none placeholder:text-muted-foreground"
						rows={1}
						style={{
							height: 'auto',
							overflow: 'hidden'
						}}
						onInput={(e) => {
							const target = e.target as HTMLTextAreaElement
							target.style.height = 'auto'
							target.style.height = Math.min(target.scrollHeight, 128) + 'px'
						}}
					/>
					<button
						type="button"
						onClick={handleSend}
						disabled={sending || uploadingImage || (!body.trim() && pendingAttachments.length === 0)}
						className="shrink-0 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploadingImage ? "..." : "Send"}
					</button>
				</div>
				{isDragOver && (
					<p className="text-xs text-primary mt-2 text-center">Drop images to attach</p>
				)}
			</div>
		</div>
	)
}
