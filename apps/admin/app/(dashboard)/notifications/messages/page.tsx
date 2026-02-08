"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, ArrowRight01Icon, ArrowLeft01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { getAllMessagesForList, sendTeamMessage, markMessageRead, markAllRead, markInboxEmailRead, archiveInboxEmail } from "@/app/(dashboard)/messages/actions"

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
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

type MessageItem = {
	id: string
	type: "team" | "inbox"
	senderName: string
	senderImage: string | null
	subject: string
	preview: string
	date: string
	isRead: boolean
	isOutgoing: boolean
	channel?: string
	fromEmail?: string
	status?: string
}

export default function NotificationMessagesPage() {
	const router = useRouter()
	const [messages, setMessages] = useState<MessageItem[]>([])
	const [loading, setLoading] = useState(true)
	const [composeOpen, setComposeOpen] = useState(false)
	const [composeBody, setComposeBody] = useState("")
	const [sending, setSending] = useState(false)
	const [filter, setFilter] = useState<"all" | "team" | "inbox">("all")

	useEffect(() => {
		getAllMessagesForList()
			.then(setMessages)
			.catch((err) => console.error("Failed to load messages:", err))
			.finally(() => setLoading(false))
	}, [])

	const filtered = filter === "all"
		? messages
		: messages.filter((m) => m.type === filter)

	const handleMarkRead = async (msg: MessageItem) => {
		if (msg.isRead) return
		try {
			if (msg.type === "inbox") {
				await markInboxEmailRead(msg.id)
			} else {
				await markMessageRead(msg.id)
			}
			setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, isRead: true } : m))
		} catch {
			// ignore
		}
	}

	const handleArchive = async (msg: MessageItem) => {
		try {
			if (msg.type === "inbox") {
				await archiveInboxEmail(msg.id)
				setMessages((prev) => prev.filter((m) => m.id !== msg.id))
				toast.success("Message archived")
			}
		} catch {
			toast.error("Failed to archive")
		}
	}

	const handleSend = async () => {
		if (!composeBody.trim()) return
		setSending(true)
		try {
			await sendTeamMessage({ body: composeBody.trim() })
			toast.success("Message sent")
			setComposeOpen(false)
			setComposeBody("")
			// Refresh messages
			const updated = await getAllMessagesForList()
			setMessages(updated)
		} catch {
			toast.error("Failed to send message")
		} finally {
			setSending(false)
		}
	}

	const handleMarkAllRead = async () => {
		try {
			await markAllRead()
			setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
			toast.success("All marked as read")
		} catch {
			toast.error("Failed to mark all as read")
		}
	}

	if (loading) {
		return (
			<div className="flex-1 p-6">
				<p className="text-sm text-muted-foreground mb-6">View and manage workspace messages and inbox.</p>
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 p-6">
			<p className="text-sm text-muted-foreground mb-4">View and manage workspace messages and inbox.</p>

			<div className="flex items-center gap-2 mb-4">
				<Button
					size="sm"
					variant={filter === "all" ? "default" : "outline"}
					className="h-8 text-xs"
					onClick={() => setFilter("all")}
				>
					All
				</Button>
				<Button
					size="sm"
					variant={filter === "inbox" ? "default" : "outline"}
					className="h-8 text-xs"
					onClick={() => setFilter("inbox")}
				>
					Inbox
				</Button>
				<Button
					size="sm"
					variant={filter === "team" ? "default" : "outline"}
					className="h-8 text-xs"
					onClick={() => setFilter("team")}
				>
					Team
				</Button>
				<div className="flex-1" />
				<Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleMarkAllRead}>
					Mark All Read
				</Button>
				<Button size="sm" className="h-8 text-xs" onClick={() => setComposeOpen(true)}>
					Compose
				</Button>
			</div>

			{filtered.length === 0 ? (
				<div className="text-center py-12">
					<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
						<HugeiconsIcon icon={Mail01Icon} size={24} className="text-muted-foreground" />
					</div>
					<h3 className="font-medium mb-1">No messages</h3>
					<p className="text-sm text-muted-foreground">
						Messages will appear here when you receive them.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{filtered.map((msg) => (
						<div
							key={msg.id}
							onClick={() => handleMarkRead(msg)}
							className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer ${!msg.isRead ? "border-primary/30 bg-primary/5" : ""}`}
						>
							<div className={`shrink-0 ${msg.isOutgoing ? "text-blue-500" : "text-green-500"}`}>
								<HugeiconsIcon
									icon={msg.isOutgoing ? ArrowRight01Icon : ArrowLeft01Icon}
									size={16}
								/>
							</div>

							<Avatar className="h-8 w-8 shrink-0">
								{msg.senderImage && <AvatarImage src={msg.senderImage} alt={msg.senderName} />}
								<AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
							</Avatar>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className={`text-sm truncate ${!msg.isRead ? "font-semibold" : "font-medium"}`}>
										{msg.senderName}
									</span>
									{msg.fromEmail && (
										<span className="text-xs text-muted-foreground truncate hidden sm:inline">
											{msg.fromEmail}
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									{msg.subject && (
										<>
											<span className="truncate">{msg.subject}</span>
											<span>·</span>
										</>
									)}
									<span className="shrink-0">{formatDate(msg.date)}</span>
								</div>
							</div>

							<Badge variant="outline" className="shrink-0 text-[10px]">
								{msg.type === "inbox" ? "Inbox" : "Team"}
							</Badge>

							{msg.type === "inbox" && (
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 h-7 w-7"
									onClick={(e) => {
										e.stopPropagation()
										handleArchive(msg)
									}}
								>
									<HugeiconsIcon icon={Delete02Icon} size={14} />
									<span className="sr-only">Archive</span>
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			<Dialog open={composeOpen} onOpenChange={setComposeOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Message</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Message</Label>
							<Textarea
								value={composeBody}
								onChange={(e) => setComposeBody(e.target.value)}
								placeholder="Type your message..."
								rows={4}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
						<Button onClick={handleSend} disabled={sending || !composeBody.trim()}>
							{sending ? "Sending..." : "Send"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
