"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image02Icon, Cancel01Icon, Link04Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePusher } from "@/components/pusher-provider"
import { CallButtonGroup } from "@/components/calls/call-button"
import { toast } from "sonner"
import {
	getConversations,
	getDirectMessages,
	sendDirectMessage,
	markDMsAsRead,
	getOrCreateConversation,
} from "@/app/(dashboard)/discover/actions"
import type { MessageAttachment } from "./types"
import { uploadChatImage, fetchLinkPreview, broadcastTyping } from "./actions"

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
					URL_REGEX.lastIndex = 0
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
			<div className="p-3">
				{preview.title && (
					<p className="text-sm font-medium line-clamp-2">{preview.title}</p>
				)}
				{preview.description && (
					<p className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview.description}</p>
				)}
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

function isOnlyUrl(body: string): boolean {
	const trimmed = body.trim()
	return URL_REGEX.test(trimmed) && trimmed.replace(URL_REGEX, "").trim() === ""
}

function getFirstUrl(body: string): string | null {
	const match = body.match(URL_REGEX)
	return match ? match[0] : null
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

type Friend = {
	id: string
	name: string | null
	username: string | null
	image: string | null
	bio: string | null
}

type Conversation = {
	id: string
	participant1Id: string
	participant2Id: string
	lastMessageAt: Date | null
	lastMessagePreview: string | null
	createdAt: Date
	otherUser: {
		id: string
		name: string | null
		username: string | null
		image: string | null
	} | null
	unreadCount: number
}

type DirectMessage = {
	id: string
	senderId: string
	body: string
	attachments: MessageAttachment[] | null
	isEdited: boolean | null
	readAt: Date | null
	createdAt: Date
	senderName: string | null
	senderImage: string | null
}

export function FriendsTab({
	userId,
	userName,
	userImage,
	onTabChange,
	initialFriends = [],
	initialConversations = [],
}: {
	userId: string
	userName: string
	userImage: string | null
	onTabChange?: (tab: "chat" | "inbox" | "friends") => void
	initialFriends?: Friend[]
	initialConversations?: Conversation[]
}) {
	const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
	const [friends, setFriends] = useState<Friend[]>(initialFriends)
	const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
	const [messages, setMessages] = useState<DirectMessage[]>([])
	const [body, setBody] = useState("")
	const [sending, setSending] = useState(false)
	const [loading, setLoading] = useState(false)
	const [loadingMessages, setLoadingMessages] = useState(false)
	const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([])
	const [isDragOver, setIsDragOver] = useState(false)
	const [uploadingImage, setUploadingImage] = useState(false)
	const [isAtBottom, setIsAtBottom] = useState(true)
	const [isTyping, setIsTyping] = useState(false)
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastTypingBroadcast = useRef(0)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { pusher } = usePusher()

	// Sync state when props change (for real-time updates after initial load)
	useEffect(() => {
		if (initialFriends.length > 0) {
			setFriends(initialFriends)
		}
	}, [initialFriends])

	useEffect(() => {
		if (initialConversations.length > 0) {
			setConversations(initialConversations)
		}
	}, [initialConversations])

	// Load messages when conversation selected
	useEffect(() => {
		if (!selectedConversation) {
			setMessages([])
			return
		}

		async function loadMessages() {
			setLoadingMessages(true)
			try {
				const msgs = await getDirectMessages(selectedConversation!.id)
				setMessages(msgs as DirectMessage[])
			} catch (err) {
				console.error("Failed to load messages:", err)
			} finally {
				setLoadingMessages(false)
			}
		}
		loadMessages()
	}, [selectedConversation?.id])

	// Real-time: receive DMs
	useEffect(() => {
		if (!pusher || !userId) return

		const channelName = `private-user-${userId}`
		const ch = pusher.subscribe(channelName)

		const handleDmReceived = (data: {
			conversationId: string
			message: {
				id: string
				senderId: string
				senderName: string | null
				senderImage: string | null
				body: string
				attachments: MessageAttachment[]
				createdAt: string
			}
		}) => {
			// Ignore our own messages (we already have them via optimistic update)
			if (data.message.senderId === userId) return

			// Update conversations list
			setConversations((prev) => {
				const existing = prev.find((c) => c.id === data.conversationId)
				if (existing) {
					return prev.map((c) =>
						c.id === data.conversationId
							? {
									...c,
									lastMessageAt: new Date(data.message.createdAt),
									lastMessagePreview: data.message.body.slice(0, 100),
									unreadCount: selectedConversation?.id === c.id ? 0 : c.unreadCount + 1,
								}
							: c
					).sort((a, b) => {
						const aTime = a.lastMessageAt?.getTime() || 0
						const bTime = b.lastMessageAt?.getTime() || 0
						return bTime - aTime
					})
				}
				// New conversation - refetch
				getConversations().then((convos) => setConversations(convos as Conversation[]))
				return prev
			})

			// Add message to current conversation
			if (selectedConversation?.id === data.conversationId) {
				setMessages((prev) => {
					if (prev.some((m) => m.id === data.message.id)) return prev
					return [...prev, {
						id: data.message.id,
						senderId: data.message.senderId,
						body: data.message.body,
						attachments: data.message.attachments,
						isEdited: false,
						readAt: null,
						createdAt: new Date(data.message.createdAt),
						senderName: data.message.senderName,
						senderImage: data.message.senderImage,
					}]
				})
				// Clear typing indicator when message arrives
				setIsTyping(false)
			}

			// Play notification sound for incoming messages
			const audio = new Audio("/sounds/message.mp3")
			audio.volume = 0.5
			audio.play().catch(() => {})
		}

		// Typing indicator
		const handleTyping = (data: { userId: string; userName: string }) => {
			// Only show typing if it's from the selected conversation's other user
			if (selectedConversation?.otherUser?.id === data.userId) {
				setIsTyping(true)
				if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
				typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
			}
		}

		// Read receipt: sender gets notified when their messages are read
		const handleDmRead = (data: { conversationId: string; messageIds: string[]; readBy: string }) => {
			if (selectedConversation?.id === data.conversationId) {
				setMessages((prev) =>
					prev.map((m) =>
						data.messageIds.includes(m.id) ? { ...m, readAt: new Date() } : m
					)
				)
			}
		}

		ch.bind("dm-received", handleDmReceived)
		ch.bind("typing", handleTyping)
		ch.bind("dm-read", handleDmRead)

		return () => {
			ch.unbind("dm-received", handleDmReceived)
			ch.unbind("typing", handleTyping)
			ch.unbind("dm-read", handleDmRead)
		}
	}, [pusher, userId, selectedConversation?.id])

	// Track scroll position
	const handleScroll = useCallback(() => {
		const container = messagesContainerRef.current
		if (!container) return
		const threshold = 100
		const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
		setIsAtBottom(atBottom)
	}, [])

	// Auto-scroll on new messages (smooth) or initial load (instant)
	const hasScrolledRef = useRef(false)
	useEffect(() => {
		if (messages.length === 0) {
			hasScrolledRef.current = false
			return
		}
		// Wait for DOM paint before scrolling
		requestAnimationFrame(() => {
			if (!hasScrolledRef.current) {
				// First load — instant scroll to bottom
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
				setIsAtBottom(true)
				hasScrolledRef.current = true
			} else if (isAtBottom) {
				// New messages while at bottom — smooth scroll
				messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
			}
		})
	}, [messages, isAtBottom])

	// Reset scroll flag on conversation switch
	useEffect(() => {
		hasScrolledRef.current = false
		setIsAtBottom(true)
	}, [selectedConversation?.id])

	// Scroll to bottom when typing indicator appears
	useEffect(() => {
		if (isTyping && isAtBottom) {
			requestAnimationFrame(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
			})
		}
	}, [isTyping, isAtBottom])

	// IntersectionObserver: mark messages as read only when they're visible on screen
	const readQueueRef = useRef<Set<string>>(new Set())
	const flushTimerRef = useRef<NodeJS.Timeout | null>(null)
	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container || !selectedConversation) return

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const msgId = (entry.target as HTMLElement).dataset.messageId
						if (msgId) {
							readQueueRef.current.add(msgId)
						}
					}
				}
				// Debounce: flush read queue after 500ms of no new intersections
				if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
				flushTimerRef.current = setTimeout(() => {
					const ids = Array.from(readQueueRef.current)
					if (ids.length > 0 && selectedConversation) {
						readQueueRef.current.clear()
						markDMsAsRead(selectedConversation.id, ids)
						// Update local unread count
						setConversations((prev) =>
							prev.map((c) =>
								c.id === selectedConversation.id
									? { ...c, unreadCount: Math.max(0, c.unreadCount - ids.length) }
									: c
							)
						)
					}
				}, 500)
			},
			{ root: container, threshold: 0.5 }
		)

		// Observe all unread incoming messages
		const unreadEls = container.querySelectorAll("[data-unread='true']")
		unreadEls.forEach((el) => observer.observe(el))

		return () => {
			observer.disconnect()
			if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
		}
	}, [messages, selectedConversation?.id])

	async function handleStartConversation(friendId: string) {
		try {
			const conversation = await getOrCreateConversation(friendId)
			const friend = friends.find((f) => f.id === friendId)
			const conv: Conversation = {
				...conversation,
				otherUser: friend ? { id: friend.id, name: friend.name, username: friend.username, image: friend.image } : null,
				unreadCount: 0,
			}
			// Add to list if not exists
			setConversations((prev) => {
				if (prev.some((c) => c.id === conv.id)) return prev
				return [conv, ...prev]
			})
			setSelectedConversation(conv)
		} catch (err) {
			toast.error("Failed to start conversation")
		}
	}

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
		if (!selectedConversation || (!body.trim() && pendingAttachments.length === 0)) return
		const messageBody = body.trim()
		const attachments = [...pendingAttachments]
		setBody("")
		setPendingAttachments([])
		setSending(true)

		// Optimistic update
		const optimisticId = `optimistic-${Date.now()}`
		const optimisticMessage: DirectMessage = {
			id: optimisticId,
			senderId: userId,
			body: messageBody,
			attachments,
			isEdited: false,
			readAt: null,
			createdAt: new Date(),
			senderName: userName,
			senderImage: userImage,
		}
		setMessages((prev) => [...prev, optimisticMessage])

		try {
			const realMessage = await sendDirectMessage(selectedConversation.id, messageBody, attachments)
			setMessages((prev) =>
				prev.map((m) =>
					m.id === optimisticId
						? {
								...m,
								id: realMessage.id,
								createdAt: realMessage.createdAt as Date,
							}
						: m
				)
			)
			// Update conversation preview
			setConversations((prev) =>
				prev.map((c) =>
					c.id === selectedConversation.id
						? { ...c, lastMessageAt: new Date(), lastMessagePreview: messageBody.slice(0, 100) }
						: c
				).sort((a, b) => {
					const aTime = a.lastMessageAt?.getTime() || 0
					const bTime = b.lastMessageAt?.getTime() || 0
					return bTime - aTime
				})
			)
		} catch {
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

	function handleTypingBroadcast() {
		const now = Date.now()
		if (now - lastTypingBroadcast.current < 2000) return
		lastTypingBroadcast.current = now
		if (selectedConversation?.otherUser?.id) {
			broadcastTyping(selectedConversation.otherUser.id).catch(() => {})
		}
	}

	// Friends who don't have a conversation yet
	const friendsWithoutConvo = friends.filter(
		(f) => !conversations.some((c) => c.otherUser?.id === f.id)
	)

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		)
	}

	// Conversation view
	if (selectedConversation) {
		const otherUser = selectedConversation.otherUser

		return (
			<div className="relative h-[calc(100svh-4rem)] overflow-hidden">
				{/* Header */}
				<div className="absolute top-0 left-0 right-0 h-14 border-b px-4 flex items-center justify-between bg-background z-10">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setSelectedConversation(null)}
							className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted"
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
						<Avatar className="h-8 w-8">
							{otherUser?.image && <AvatarImage src={otherUser.image} alt={otherUser.name || ""} />}
							<AvatarFallback className="text-xs">{getInitials(otherUser?.name || "?")}</AvatarFallback>
						</Avatar>
						<div>
							<p className="text-sm font-medium">{otherUser?.name || "Unknown"}</p>
							{otherUser?.username && (
								<p className="text-xs text-muted-foreground">@{otherUser.username}</p>
							)}
						</div>
					</div>
					{otherUser?.id && (
						<CallButtonGroup
							participantIds={[otherUser.id]}
							className="flex items-center gap-1"
						/>
					)}
				</div>

				{/* Messages */}
				<div
					ref={messagesContainerRef}
					onScroll={handleScroll}
					className="absolute inset-0 top-14 bottom-[88px] overflow-y-auto p-4 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{loadingMessages ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-sm text-muted-foreground">Loading messages...</p>
						</div>
					) : messages.length === 0 ? (
						<div className="flex items-center justify-center h-full">
							<div className="text-center">
								<p className="text-sm text-muted-foreground">No messages yet</p>
								<p className="text-xs text-muted-foreground/60 mt-1">
									Send a message to start the conversation.
								</p>
							</div>
						</div>
					) : (
						messages.map((msg, idx) => {
							const isOwn = msg.senderId === userId

							// Message grouping for DMs
							const nextMsg = messages[idx + 1]
							const prevMsg = messages[idx - 1]
							const isSameSenderAsNext = nextMsg && nextMsg.senderId === msg.senderId
							const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId
							const isFirstInGroup = !isSameSenderAsPrev
							const isLastInGroup = !isSameSenderAsNext

							// Read receipt: show on last own message if the other user has read up to it
							const isLastOwnMessage = isOwn && messages.slice(idx + 1).every(m => m.senderId !== userId)
							// Find the last message from the other person that has readAt set
							const otherHasRead = isLastOwnMessage && msg.readAt !== null
							// Track unread incoming messages for IntersectionObserver
							const isUnreadIncoming = !isOwn && msg.readAt === null

							return (
								<div
									key={msg.id}
									data-message-id={msg.id}
									data-unread={isUnreadIncoming ? "true" : undefined}
									className={`group flex gap-2.5 items-start rounded-lg ${isOwn ? "flex-row-reverse" : ""}`}
									style={isSameSenderAsNext ? { marginBottom: "2px" } : undefined}
								>
									{/* Avatar: only show on first message in group */}
									{isFirstInGroup ? (
										<Avatar className="h-9 w-9 shrink-0">
											{msg.senderImage && <AvatarImage src={msg.senderImage} alt={msg.senderName || ""} />}
											<AvatarFallback className="text-xs">{getInitials(msg.senderName || "?")}</AvatarFallback>
										</Avatar>
									) : (
										<div className="w-9 shrink-0" />
									)}
									<div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
										{/* Attachments */}
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
										{/* Message bubble */}
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
										{/* Name/timestamp: only on last message in a group */}
										{isLastInGroup && (
											<div className={`flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground ${isOwn ? "flex-row-reverse" : ""}`}>
												<span className="font-medium">{isOwn ? "You" : (msg.senderName || "").split(" ")[0]}</span>
												<span className="text-muted-foreground/50">·</span>
												<span>{timeAgo(msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt))}</span>
												{isLastOwnMessage && otherHasRead && (
													<>
														<span className="text-muted-foreground/50">·</span>
														<span className="flex items-center gap-0.5 text-primary/70">
															<svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
																<path d="M2 8.5l3.5 3.5L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
															</svg>
															Read
														</span>
													</>
												)}
											</div>
										)}
									</div>
								</div>
							)
						})
					)}
					{/* Typing indicator */}
					{isTyping && (
						<div className="flex items-center gap-2 px-1">
							<Avatar className="h-9 w-9 shrink-0">
								{otherUser?.image && <AvatarImage src={otherUser.image} alt={otherUser.name || ""} />}
								<AvatarFallback className="text-xs">{getInitials(otherUser?.name || "?")}</AvatarFallback>
							</Avatar>
							<div className="flex gap-1 items-center px-3 py-2 rounded-lg bg-muted">
								<span className="flex gap-0.5">
									<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
									<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
									<span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
								</span>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input bar */}
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
							onChange={(e) => { setBody(e.target.value); if (e.target.value.trim()) handleTypingBroadcast() }}
							onKeyDown={handleKeyDown}
							placeholder={isDragOver ? "Drop images here..." : `Message ${otherUser?.name || "friend"}...`}
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

	// Conversations list view
	return (
		<div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden">
			{/* Header with tab toggle */}
			{onTabChange && (
				<div className="h-12 border-b px-4 flex items-center justify-between shrink-0">
					<span className="text-sm font-medium">Friends</span>
					<Tabs value="friends" onValueChange={(v) => onTabChange(v as "chat" | "inbox" | "friends")}>
						<TabsList className="h-8">
							<TabsTrigger value="chat" className="text-xs px-3 h-6">Team</TabsTrigger>
							<TabsTrigger value="friends" className="text-xs px-3 h-6">Friends</TabsTrigger>
							<TabsTrigger value="inbox" className="text-xs px-3 h-6">Inbox</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			)}
			<div className="flex-1 overflow-auto p-4 space-y-4">
			{/* Active conversations */}
			{conversations.length > 0 && (
				<div>
					<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
						Conversations
					</h3>
					<div className="space-y-1">
						{conversations.map((conv) => (
							<button
								key={conv.id}
								type="button"
								onClick={() => setSelectedConversation(conv)}
								className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
							>
								<Avatar className="h-10 w-10">
									{conv.otherUser?.image && <AvatarImage src={conv.otherUser.image} alt={conv.otherUser.name || ""} />}
									<AvatarFallback className="text-xs">{getInitials(conv.otherUser?.name || "?")}</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium truncate">{conv.otherUser?.name || "Unknown"}</p>
										{conv.lastMessageAt && (
											<span className="text-[10px] text-muted-foreground">
												{timeAgo(conv.lastMessageAt.toISOString())}
											</span>
										)}
									</div>
									<p className="text-xs text-muted-foreground truncate">
										{conv.lastMessagePreview || "No messages yet"}
									</p>
								</div>
								{conv.unreadCount > 0 && (
									<span className="shrink-0 min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
										{conv.unreadCount}
									</span>
								)}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Friends to message */}
			{friendsWithoutConvo.length > 0 && (
				<div>
					<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
						Start a conversation
					</h3>
					<div className="space-y-1">
						{friendsWithoutConvo.map((friend) => (
							<button
								key={friend.id}
								type="button"
								onClick={() => handleStartConversation(friend.id)}
								className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
							>
								<Avatar className="h-10 w-10">
									{friend.image && <AvatarImage src={friend.image} alt={friend.name || ""} />}
									<AvatarFallback className="text-xs">{getInitials(friend.name || "?")}</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{friend.name || "Unknown"}</p>
									{friend.username && (
										<p className="text-xs text-muted-foreground">@{friend.username}</p>
									)}
								</div>
							</button>
						))}
					</div>
				</div>
			)}

				{/* Empty state */}
			{conversations.length === 0 && friends.length === 0 && (
				<div className="flex items-center justify-center h-full">
					<div className="text-center">
						<p className="text-sm text-muted-foreground">No friends yet</p>
						<p className="text-xs text-muted-foreground/60 mt-1">
							Add friends from the Discover page to start messaging.
						</p>
					</div>
				</div>
			)}
			</div>
		</div>
	)
}
