"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { sendInboxReply, markInboxEmailRead } from "./actions"
import { useLiveInbox } from "@/hooks/use-live-inbox"
import type { InboxEmail, InboxEmailReply } from "./types"

const statusStyles: Record<string, string> = {
	unread: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	read: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	replied: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

function InboxThread({
	email,
	onBack,
	onReplyAdded,
}: {
	email: InboxEmail
	onBack: () => void
	onReplyAdded: (emailId: string, reply: InboxEmailReply) => void
}) {
	const [replyBody, setReplyBody] = useState("")
	const [isPending, startTransition] = useTransition()

	async function handleSendReply() {
		if (!replyBody.trim()) return

		startTransition(async () => {
			try {
				const reply = await sendInboxReply({
					emailId: email.id,
					body: replyBody.trim(),
				})
				onReplyAdded(email.id, reply)
				setReplyBody("")
			} catch (err) {
				console.error("Reply error:", err)
			}
		})
	}

	return (
		<div className="space-y-4">
			<Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
					<path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
				Back to inbox
			</Button>

			<div className="rounded-lg border">
				{/* Email header */}
				<div className="px-4 py-3 border-b bg-muted/30">
					<h3 className="text-sm font-semibold">{email.subject}</h3>
					<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
						<span className="text-xs text-muted-foreground">
							From: <span className="font-medium text-foreground">{email.fromName}</span> &lt;{email.fromEmail}&gt;
						</span>
						<span className="text-xs text-muted-foreground">
							{formatDate(new Date(email.receivedAt))}
						</span>
					</div>
				</div>

				{/* Email body */}
				<div className="px-4 py-4">
					<p className="text-sm whitespace-pre-wrap leading-relaxed">{email.body}</p>
				</div>
			</div>

			{/* Replies */}
			{email.replies.length > 0 && (
				<div className="space-y-3">
					{email.replies.map((reply) => (
						<div key={reply.id} className="rounded-lg border px-4 py-3">
							<div className="flex items-center gap-2 mb-2">
								<span className="text-xs font-medium">{reply.from}</span>
								<span className="text-[11px] text-muted-foreground">
									{formatDate(new Date(reply.sentAt))}
								</span>
							</div>
							<p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
						</div>
					))}
				</div>
			)}

			{/* Reply compose */}
			<div className="rounded-lg border p-4 space-y-3">
				<p className="text-xs font-medium text-muted-foreground">Reply to {email.fromName}</p>
				<Textarea
					value={replyBody}
					onChange={(e) => setReplyBody(e.target.value)}
					placeholder="Write your reply..."
					className="min-h-24 resize-none text-sm"
				/>
				<div className="flex justify-end">
					<Button
						size="sm"
						onClick={handleSendReply}
						disabled={isPending || !replyBody.trim()}
					>
						{isPending ? "Sending..." : "Send Reply"}
					</Button>
				</div>
			</div>
		</div>
	)
}

export function InboxTab({
	emails: initialEmails,
	activeTab,
	onTabChange,
	selectedEmailId,
}: {
	emails: InboxEmail[]
	activeTab: "chat" | "inbox" | "friends"
	onTabChange: (tab: "chat" | "inbox" | "friends") => void
	selectedEmailId?: string
}) {
	const [emails, setEmails] = useState(initialEmails)
	const [selectedId, setSelectedId] = useState<string | null>(selectedEmailId ?? null)
	const [statusFilter, setStatusFilter] = useState("all")

	// Real-time inbox updates
	const handleNewEmail = useCallback((email: {
		id: string
		fromName: string
		fromEmail: string
		subject: string
		body: string
		receivedAt: string
		status: "unread" | "read" | "replied"
	}) => {
		setEmails((prev) => [{
			...email,
			replies: [],
		}, ...prev])
	}, [])

	useLiveInbox({ onNewEmail: handleNewEmail })

	const selectedEmail = emails.find((e) => e.id === selectedId)

	// Handle marking email as read and selecting it
	async function handleSelectEmail(id: string) {
		const email = emails.find((e) => e.id === id)
		if (email?.status === "unread") {
			// Optimistically mark as read
			setEmails((prev) =>
				prev.map((e) => (e.id === id ? { ...e, status: "read" as const } : e))
			)
			// Update server
			markInboxEmailRead(id).catch(() => {
				// Revert on error
				setEmails((prev) =>
					prev.map((e) => (e.id === id ? { ...e, status: "unread" as const } : e))
				)
			})
		}
		setSelectedId(id)
	}

	// Handle reply being added
	function handleReplyAdded(emailId: string, reply: InboxEmailReply) {
		setEmails((prev) =>
			prev.map((e) =>
				e.id === emailId
					? { ...e, status: "replied" as const, replies: [...e.replies, reply] }
					: e
			)
		)
	}

	if (selectedEmail) {
		return (
			<InboxThread
				email={selectedEmail}
				onBack={() => setSelectedId(null)}
				onReplyAdded={handleReplyAdded}
			/>
		)
	}

	const filteredEmails = statusFilter === "all"
		? emails
		: emails.filter((e) => e.status === statusFilter)

	const columns: Column<InboxEmail>[] = [
		{
			key: "from",
			header: "From",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.fromName}</span>
					<span className="block text-xs text-muted-foreground">{row.fromEmail}</span>
				</div>
			),
		},
		{
			key: "subject",
			header: "Subject",
			cell: (row) => (
				<span className="text-sm truncate max-w-[300px] block">{row.subject}</span>
			),
		},
		{
			key: "date",
			header: "Date",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{formatDate(new Date(row.receivedAt))}
				</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => (
				<Badge
					variant="secondary"
					className={`text-[10px] px-1.5 py-0 capitalize ${statusStyles[row.status] ?? ""}`}
				>
					{row.status}
				</Badge>
			),
		},
	]

	return (
		<div className="flex h-[calc(100vh-6rem)] flex-col rounded-lg border overflow-hidden">
			{/* Header with tab toggle */}
			<div className="h-12 border-b px-4 flex items-center justify-between shrink-0">
				<span className="text-sm font-medium">Customer Inbox</span>
				<Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "chat" | "inbox" | "friends")}>
					<TabsList className="h-8">
						<TabsTrigger value="chat" className="text-xs px-3 h-6">Team</TabsTrigger>
						<TabsTrigger value="friends" className="text-xs px-3 h-6">Friends</TabsTrigger>
						<TabsTrigger value="inbox" className="text-xs px-3 h-6">Inbox</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<div className="flex-1 overflow-auto p-4">
				<DataTable
					columns={columns}
					data={filteredEmails}
					searchPlaceholder="Search emails..."
					totalCount={filteredEmails.length}
					currentPage={1}
					pageSize={25}
					getId={(row) => row.id}
					onRowClick={(row) => handleSelectEmail(row.id)}
					emptyMessage="No emails yet"
					emptyDescription="Customer inquiries from the contact page will appear here."
					filters={
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[130px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="unread">Unread</SelectItem>
								<SelectItem value="read">Read</SelectItem>
								<SelectItem value="replied">Replied</SelectItem>
							</SelectContent>
						</Select>
					}
				/>
			</div>
		</div>
	)
}
