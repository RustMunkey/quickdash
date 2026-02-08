"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Tick02Icon, MailSend01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSession } from "@/lib/auth-client"
import { usePusher } from "@/components/pusher-provider"
import {
	getTeamMessages,
	getTeamMembers,
	sendTeamMessage,
	markMessageRead,
	getInboxEmails,
	sendInboxReply,
	markInboxEmailRead,
} from "@/app/(dashboard)/messages/actions"

interface Message {
	id: string
	senderId: string | null
	senderName: string
	senderImage: string | null
	channel: string
	body: string | null
	createdAt: string
	readAt: string | null
}

interface TeamMember {
	id: string
	name: string | null
	email: string
	image: string | null
}

interface InboxEmail {
	id: string
	fromName: string
	fromEmail: string
	subject: string
	body: string
	receivedAt: string
	status: "unread" | "read" | "replied"
	replies: Array<{ id: string; from: string; body: string; sentAt: string }>
}

function formatTime(dateStr: string) {
	const date = new Date(dateStr)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return "now"
	if (mins < 60) return `${mins}m`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h`
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

// Chat Messages Tab
function ChatTab({
	messages,
	members,
	userId,
	onSendMessage,
}: {
	messages: Message[]
	members: TeamMember[]
	userId: string
	onSendMessage: (body: string) => void
}) {
	const [input, setInput] = useState("")
	const scrollRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [messages])

	const handleSend = () => {
		if (!input.trim()) return
		onSendMessage(input.trim())
		setInput("")
	}

	return (
		<div className="flex flex-col h-full">
			<div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<p className="text-sm text-muted-foreground">No messages yet</p>
						<p className="text-xs text-muted-foreground/60 mt-1">
							Start a conversation with your team
						</p>
					</div>
				) : (
					messages.map((msg) => {
						const isOwn = msg.senderId === userId
						return (
							<div
								key={msg.id}
								className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
							>
								{!isOwn && (
									<Avatar className="size-6 shrink-0">
										{msg.senderImage && <AvatarImage src={msg.senderImage} />}
										<AvatarFallback className="text-[9px]">
											{getInitials(msg.senderName)}
										</AvatarFallback>
									</Avatar>
								)}
								<div className={`max-w-[80%] ${isOwn ? "text-right" : ""}`}>
									{!isOwn && (
										<span className="text-[10px] text-muted-foreground">
											{msg.senderName}
										</span>
									)}
									<div
										className={`rounded-lg px-3 py-1.5 text-sm ${
											isOwn
												? "bg-primary text-primary-foreground"
												: "bg-muted"
										}`}
									>
										{msg.body}
									</div>
									<span className="text-[9px] text-muted-foreground">
										{formatTime(msg.createdAt)}
									</span>
								</div>
							</div>
						)
					})
				)}
			</div>
			<div className="p-3 border-t">
				<div className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type a message..."
						className="h-8 text-sm"
						onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
					/>
					<Button size="icon" className="size-8 shrink-0" onClick={handleSend}>
						<HugeiconsIcon icon={MailSend01Icon} size={14} />
					</Button>
				</div>
			</div>
		</div>
	)
}

// Inbox Tab
function InboxTab({
	emails,
	onSelectEmail,
	selectedId,
}: {
	emails: InboxEmail[]
	onSelectEmail: (id: string) => void
	selectedId: string | null
}) {
	return (
		<div className="flex-1 overflow-y-auto">
			{emails.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-40 text-center">
					<p className="text-sm text-muted-foreground">No emails</p>
					<p className="text-xs text-muted-foreground/60 mt-1">
						Customer messages appear here
					</p>
				</div>
			) : (
				<div className="divide-y">
					{emails.map((email) => (
						<div
							key={email.id}
							onClick={() => onSelectEmail(email.id)}
							className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
								selectedId === email.id ? "bg-muted" : ""
							} ${email.status === "unread" ? "bg-primary/5" : ""}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-medium truncate">
									{email.fromName}
								</span>
								<span className="text-[10px] text-muted-foreground shrink-0">
									{formatTime(email.receivedAt)}
								</span>
							</div>
							<p className="text-xs text-muted-foreground truncate mt-0.5">
								{email.subject}
							</p>
							<div className="flex items-center gap-1.5 mt-1">
								<Badge
									variant="secondary"
									className={`text-[9px] px-1 py-0 ${
										email.status === "unread"
											? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
											: email.status === "replied"
											? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
											: ""
									}`}
								>
									{email.status}
								</Badge>
								{email.replies.length > 0 && (
									<span className="text-[9px] text-muted-foreground">
										{email.replies.length} {email.replies.length === 1 ? "reply" : "replies"}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// Email Thread View
function EmailThread({
	email,
	onBack,
	onReply,
}: {
	email: InboxEmail
	onBack: () => void
	onReply: (body: string) => void
}) {
	const [replyText, setReplyText] = useState("")
	const [sending, setSending] = useState(false)

	const handleSend = async () => {
		if (!replyText.trim() || sending) return
		setSending(true)
		onReply(replyText.trim())
		setReplyText("")
		setSending(false)
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b">
				<Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={onBack}>
					<HugeiconsIcon icon={Cancel01Icon} size={14} className="mr-1" />
					Back
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto p-3 space-y-3">
				{/* Original email */}
				<div className="rounded-lg border p-3">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium">{email.fromName}</span>
						<span className="text-[10px] text-muted-foreground">
							{formatTime(email.receivedAt)}
						</span>
					</div>
					<p className="text-xs font-medium text-muted-foreground mb-1">
						{email.subject}
					</p>
					<p className="text-sm whitespace-pre-wrap">{email.body}</p>
				</div>
				{/* Replies */}
				{email.replies.map((reply) => (
					<div key={reply.id} className="rounded-lg border p-3 ml-4">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium">{reply.from}</span>
							<span className="text-[10px] text-muted-foreground">
								{formatTime(reply.sentAt)}
							</span>
						</div>
						<p className="text-sm whitespace-pre-wrap">{reply.body}</p>
					</div>
				))}
			</div>
			<div className="p-3 border-t">
				<div className="flex gap-2">
					<Input
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						placeholder={`Reply to ${email.fromName}...`}
						className="h-8 text-sm"
						onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
					/>
					<Button
						size="icon"
						className="size-8 shrink-0"
						onClick={handleSend}
						disabled={sending || !replyText.trim()}
					>
						<HugeiconsIcon icon={MailSend01Icon} size={14} />
					</Button>
				</div>
			</div>
		</div>
	)
}

export function MessagesSidebar({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { data: session } = useSession()
	const { pusher, workspaceId } = usePusher()
	const [tab, setTab] = useState<"chat" | "inbox">("chat")
	const [messages, setMessages] = useState<Message[]>([])
	const [members, setMembers] = useState<TeamMember[]>([])
	const [emails, setEmails] = useState<InboxEmail[]>([])
	const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
	const [unreadChat, setUnreadChat] = useState(0)
	const [unreadInbox, setUnreadInbox] = useState(0)

	const userId = session?.user?.id || ""

	// Load data
	useEffect(() => {
		if (!open || !userId) return

		getTeamMessages(userId).then((msgs) => {
			setMessages(
				msgs.map((m) => ({
					...m,
					createdAt: m.createdAt.toISOString(),
					readAt: m.readAt?.toISOString() || null,
				}))
			)
			setUnreadChat(msgs.filter((m) => !m.readAt).length)
		})

		getTeamMembers().then((m) =>
			setMembers(m.map((member) => ({ ...member, name: member.name || "Unknown" })))
		)

		getInboxEmails().then((e) => {
			setEmails(e)
			setUnreadInbox(e.filter((email) => email.status === "unread").length)
		})
	}, [open, userId])

	// Real-time updates
	useEffect(() => {
		if (!pusher || !userId) return

		const channel = pusher.subscribe(`private-user-${userId}`)

		channel.bind("new-message", (data: Message) => {
			setMessages((prev) => [...prev, data])
			if (data.senderId !== userId) {
				setUnreadChat((c) => c + 1)
			}
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(`private-user-${userId}`)
		}
	}, [pusher, userId])

	// Real-time inbox updates
	useEffect(() => {
		if (!pusher || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-inbox`
		const channel = pusher.subscribe(channelName)

		channel.bind("new-email", (data: InboxEmail) => {
			setEmails((prev) => [{ ...data, replies: [] }, ...prev])
			setUnreadInbox((c) => c + 1)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, workspaceId])

	const handleSendMessage = useCallback(
		async (body: string) => {
			const msg = await sendTeamMessage({ body, channel: "general" })
			// Message will come back via Pusher
		},
		[]
	)

	const handleSelectEmail = useCallback(
		(id: string) => {
			setSelectedEmailId(id)
			const email = emails.find((e) => e.id === id)
			if (email?.status === "unread") {
				markInboxEmailRead(id)
				setEmails((prev) =>
					prev.map((e) => (e.id === id ? { ...e, status: "read" as const } : e))
				)
				setUnreadInbox((c) => Math.max(0, c - 1))
			}
		},
		[emails]
	)

	const handleReply = useCallback(
		async (body: string) => {
			if (!selectedEmailId) return
			const reply = await sendInboxReply({ emailId: selectedEmailId, body })
			setEmails((prev) =>
				prev.map((e) =>
					e.id === selectedEmailId
						? { ...e, status: "replied" as const, replies: [...e.replies, reply] }
						: e
				)
			)
		},
		[selectedEmailId]
	)

	const selectedEmail = emails.find((e) => e.id === selectedEmailId)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
				<SheetHeader className="p-4 pb-0">
					<SheetTitle className="text-base">Messages</SheetTitle>
				</SheetHeader>

				{selectedEmail ? (
					<EmailThread
						email={selectedEmail}
						onBack={() => setSelectedEmailId(null)}
						onReply={handleReply}
					/>
				) : (
					<Tabs
						value={tab}
						onValueChange={(v) => setTab(v as "chat" | "inbox")}
						className="flex-1 flex flex-col"
					>
						<div className="px-4 pt-2">
							<TabsList className="w-full">
								<TabsTrigger value="chat" className="flex-1 text-xs relative">
									Chat
									{unreadChat > 0 && (
										<span className="ml-1.5 size-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
											{unreadChat > 9 ? "9+" : unreadChat}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger value="inbox" className="flex-1 text-xs relative">
									Inbox
									{unreadInbox > 0 && (
										<span className="ml-1.5 size-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center">
											{unreadInbox > 9 ? "9+" : unreadInbox}
										</span>
									)}
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="chat" className="flex-1 mt-0 data-[state=active]:flex flex-col">
							<ChatTab
								messages={messages}
								members={members}
								userId={userId}
								onSendMessage={handleSendMessage}
							/>
						</TabsContent>

						<TabsContent value="inbox" className="flex-1 mt-0 data-[state=active]:flex flex-col">
							<InboxTab
								emails={emails}
								onSelectEmail={handleSelectEmail}
								selectedId={selectedEmailId}
							/>
						</TabsContent>
					</Tabs>
				)}
			</SheetContent>
		</Sheet>
	)
}
