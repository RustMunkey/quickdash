"use client"

import { useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ReloadIcon, Mail01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"
import type { TeamMessage, TeamMember, Conversation } from "@/app/(dashboard)/messages/types"
import { useRecentConversations } from "@/hooks/use-recent-conversations"
import { useTeamPresence } from "@/hooks/use-team-presence"
import { StatusDot } from "@/components/presence/status-indicator"

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

type Friend = {
	id: string
	name: string | null
	username: string | null
	image: string | null
}

type InboxEmailSummary = {
	id: string
	fromName: string
	fromEmail: string
	subject: string
	status: "unread" | "read" | "replied"
}

type ViewMode = "chat" | "friends" | "inbox"

// Collapsed view - shows just avatars
export function ChatSidebarCollapsed({
	active,
	onSelect,
	teamMembers,
	friends,
	inboxEmails,
	userId,
	messages,
	viewMode,
}: {
	active: Conversation
	onSelect: (c: Conversation) => void
	teamMembers: TeamMember[]
	friends: Friend[]
	inboxEmails: InboxEmailSummary[]
	userId: string
	messages: TeamMessage[]
	viewMode: ViewMode
}) {
	const { getStatus } = useTeamPresence()
	const { isMobile, setOpenMobile } = useSidebar()

	const handleSelect = (conversation: Conversation) => {
		onSelect(conversation)
		if (isMobile) {
			setOpenMobile(false)
		}
	}

	if (viewMode === "inbox") {
		return (
			<div className="flex flex-col items-center gap-1 py-2">
				{inboxEmails.map((email) => (
					<Tooltip key={email.id} delayDuration={0}>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="relative size-8 rounded-md flex items-center justify-center text-sm transition-colors hover:bg-muted/50"
							>
								<div className="relative overflow-visible">
									<Avatar className="h-6 w-6">
										<AvatarFallback className="text-[9px]">{getInitials(email.fromName)}</AvatarFallback>
									</Avatar>
									{email.status === "unread" && (
										<span className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
									)}
								</div>
							</button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={8}>
							<p>{email.fromName}</p>
							<p className="text-xs text-muted-foreground">{email.fromEmail}</p>
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		)
	}

	if (viewMode === "friends") {
		return (
			<div className="flex flex-col items-center gap-1 py-2">
				{friends.map((friend) => {
					const isActive = active.type === "dm" && active.id === friend.id
					const status = getStatus(friend.id)
					return (
						<Tooltip key={friend.id} delayDuration={0}>
							<TooltipTrigger asChild>
								<button
									type="button"
									className={`size-8 rounded-md flex items-center justify-center transition-colors ${
										isActive ? "bg-muted" : "hover:bg-muted/50"
									}`}
									onClick={() => handleSelect({ type: "dm", id: friend.id, label: friend.name || "Friend" })}
								>
									<div className="relative overflow-visible">
										<Avatar className="h-6 w-6">
											{friend.image && <AvatarImage src={friend.image} alt={friend.name || ""} />}
											<AvatarFallback className="text-[9px]">{getInitials(friend.name || "?")}</AvatarFallback>
										</Avatar>
										<StatusDot status={status} size="sm" />
									</div>
								</button>
							</TooltipTrigger>
							<TooltipContent side="right" sideOffset={8}>
								<p>{friend.name}</p>
							</TooltipContent>
						</Tooltip>
					)
				})}
			</div>
		)
	}

	// Team tab - show team members
	return (
		<div className="flex flex-col items-center gap-1 py-2">
			{teamMembers
				.filter((m) => m.id !== userId)
				.map((member) => {
					const isActive = active.type === "dm" && active.id === member.id
					const status = getStatus(member.id)
					return (
						<Tooltip key={member.id} delayDuration={0}>
							<TooltipTrigger asChild>
								<button
									type="button"
									className={`size-8 rounded-md flex items-center justify-center transition-colors ${
										isActive ? "bg-muted" : "hover:bg-muted/50"
									}`}
									onClick={() => handleSelect({ type: "dm", id: member.id, label: member.name })}
								>
									<div className="relative overflow-visible">
										<Avatar className="h-6 w-6">
											{member.image && <AvatarImage src={member.image} alt={member.name} />}
											<AvatarFallback className="text-[9px]">{getInitials(member.name)}</AvatarFallback>
										</Avatar>
										<StatusDot status={status} size="sm" />
									</div>
								</button>
							</TooltipTrigger>
							<TooltipContent side="right" sideOffset={8}>
								<p>{member.name}</p>
							</TooltipContent>
						</Tooltip>
					)
				})}
		</div>
	)
}

// Expanded view - shows full list
export function ChatSidebarExpanded({
	active,
	onSelect,
	teamMembers,
	friends,
	inboxEmails,
	userId,
	messages,
	viewMode,
	recentConversations,
	onTrackConversation,
}: {
	active: Conversation
	onSelect: (c: Conversation) => void
	teamMembers: TeamMember[]
	friends: Friend[]
	inboxEmails: InboxEmailSummary[]
	userId: string
	messages: TeamMessage[]
	viewMode: ViewMode
	recentConversations: Conversation[]
	onTrackConversation: (c: Conversation) => void
}) {
	const { getStatus } = useTeamPresence()
	const { isMobile, setOpenMobile } = useSidebar()

	const handleSelect = (conversation: Conversation) => {
		onTrackConversation(conversation)
		onSelect(conversation)
		if (isMobile) {
			setOpenMobile(false)
		}
	}

	// Filter recents to only DMs (no channels)
	const filteredRecents = recentConversations.filter(
		(c) => c.type === "dm" && !(c.type === active.type && c.id === active.id)
	)

	if (viewMode === "inbox") {
		const unreadCount = inboxEmails.filter((e) => e.status === "unread").length
		return (
			<div className="flex flex-col h-full">
				<div className="px-3 pt-4 pb-2">
					<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Inbox {unreadCount > 0 && `(${unreadCount})`}
					</span>
				</div>
				{inboxEmails.length === 0 ? (
					<div className="px-3 py-4 text-center">
						<p className="text-xs text-muted-foreground">No emails yet</p>
					</div>
				) : (
					inboxEmails.map((email) => (
						<div
							key={email.id}
							className="mx-2 flex items-center gap-2 px-3 py-2 text-sm rounded-md"
						>
							<div className="relative overflow-visible">
								<Avatar className="h-5 w-5">
									<AvatarFallback className="text-[9px]">{getInitials(email.fromName)}</AvatarFallback>
								</Avatar>
								{email.status === "unread" && (
									<span className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<span className={`text-left truncate block text-xs ${email.status === "unread" ? "font-medium" : ""}`}>
									{email.fromName}
								</span>
								<span className="text-left truncate block text-[10px] text-muted-foreground">
									{email.fromEmail}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		)
	}

	if (viewMode === "friends") {
		return (
			<div className="flex flex-col h-full">
				{/* Recent Section */}
				{filteredRecents.length > 0 && (
					<>
						<div className="px-3 pt-4 pb-2 flex items-center gap-1.5">
							<HugeiconsIcon icon={ReloadIcon} size={11} className="text-muted-foreground" />
							<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
								Recent
							</span>
						</div>
						{filteredRecents.map((conv) => {
							const isActive = active.type === conv.type && active.id === conv.id
							const friend = friends.find((f) => f.id === conv.id)
							const status = conv.id ? getStatus(conv.id) : "offline"

							return (
								<button
									key={`${conv.type}-${conv.id}`}
									type="button"
									className={`mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
										isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
									}`}
									onClick={() => handleSelect(conv)}
								>
									<div className="relative overflow-visible">
										<Avatar className="h-5 w-5">
											{friend?.image && <AvatarImage src={friend.image} alt={conv.label} />}
											<AvatarFallback className="text-[9px]">{getInitials(conv.label)}</AvatarFallback>
										</Avatar>
										<StatusDot status={status} size="sm" />
									</div>
									<span className="flex-1 text-left truncate">{conv.label}</span>
								</button>
							)
						})}
						<div className="mx-3 my-2 h-px bg-border" />
					</>
				)}

				<div className="px-3 pt-4 pb-2">
					<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Friends
					</span>
				</div>
				{friends.length === 0 ? (
					<div className="px-3 py-4 text-center">
						<p className="text-xs text-muted-foreground">No friends yet</p>
						<p className="text-[10px] text-muted-foreground/60 mt-1">Add friends from Discover</p>
					</div>
				) : (
					friends.map((friend) => {
						const isActive = active.type === "dm" && active.id === friend.id
						const status = getStatus(friend.id)
						return (
							<button
								key={friend.id}
								type="button"
								className={`mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
									isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
								}`}
								onClick={() => handleSelect({ type: "dm", id: friend.id, label: friend.name || "Friend" })}
							>
								<div className="relative overflow-visible">
									<Avatar className="h-5 w-5">
										{friend.image && <AvatarImage src={friend.image} alt={friend.name || ""} />}
										<AvatarFallback className="text-[9px]">{getInitials(friend.name || "?")}</AvatarFallback>
									</Avatar>
									<StatusDot status={status} size="sm" />
								</div>
								<span className="flex-1 text-left truncate">{friend.name || "Unknown"}</span>
								{friend.username && (
									<span className="text-[10px] text-muted-foreground">@{friend.username}</span>
								)}
							</button>
						)
					})
				)}
			</div>
		)
	}

	// Team tab
	return (
		<div className="flex flex-col h-full">
			{/* Recent Section */}
			{filteredRecents.length > 0 && (
				<>
					<div className="px-3 pt-4 pb-2 flex items-center gap-1.5">
						<HugeiconsIcon icon={ReloadIcon} size={11} className="text-muted-foreground" />
						<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
							Recent
						</span>
					</div>
					{filteredRecents.map((conv) => {
						const isActive = active.type === conv.type && active.id === conv.id
						const member = teamMembers.find((m) => m.id === conv.id)
						const status = conv.id ? getStatus(conv.id) : "offline"

						return (
							<button
								key={`${conv.type}-${conv.id}`}
								type="button"
								className={`mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
									isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
								}`}
								onClick={() => handleSelect(conv)}
							>
								<div className="relative overflow-visible">
									<Avatar className="h-5 w-5">
										{member?.image && <AvatarImage src={member.image} alt={conv.label} />}
										<AvatarFallback className="text-[9px]">{getInitials(conv.label)}</AvatarFallback>
									</Avatar>
									<StatusDot status={status} size="sm" />
								</div>
								<span className="flex-1 text-left truncate">{conv.label}</span>
							</button>
						)
					})}
					<div className="mx-3 my-2 h-px bg-border" />
				</>
			)}

			<div className="px-3 pt-4 pb-2">
				<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
					Team Members
				</span>
			</div>
			{teamMembers
				.filter((m) => m.id !== userId)
				.map((member) => {
					const isActive = active.type === "dm" && active.id === member.id
					const status = getStatus(member.id)
					return (
						<button
							key={member.id}
							type="button"
							className={`mx-2 flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${
								isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
							}`}
							onClick={() => handleSelect({ type: "dm", id: member.id, label: member.name })}
						>
							<div className="relative overflow-visible">
								<Avatar className="h-5 w-5">
									{member.image && <AvatarImage src={member.image} alt={member.name} />}
									<AvatarFallback className="text-[9px]">{getInitials(member.name)}</AvatarFallback>
								</Avatar>
								<StatusDot status={status} size="sm" />
							</div>
							<span className="flex-1 text-left truncate">{member.name}</span>
						</button>
					)
				})}
		</div>
	)
}

// Combined component that shows both states (uses CSS to toggle)
export function ChatSidebar({
	active,
	onSelect,
	teamMembers,
	friends,
	inboxEmails,
	userId,
	messages,
	viewMode,
}: {
	active: Conversation
	onSelect: (c: Conversation) => void
	teamMembers: TeamMember[]
	friends: Friend[]
	inboxEmails: { id: string; fromName: string; fromEmail: string; subject: string; status: "unread" | "read" | "replied" }[]
	userId: string
	messages: TeamMessage[]
	viewMode: ViewMode
}) {
	const { recentConversations, trackConversation } = useRecentConversations()
	const { isMobile, setOpenMobile } = useSidebar()

	// Track initial conversation on mount
	useEffect(() => {
		if (active && active.id) {
			trackConversation(active)
		}
	}, []) // Only on mount

	const handleSelect = (conversation: Conversation) => {
		trackConversation(conversation)
		onSelect(conversation)
		// Close sidebar on mobile after selecting a conversation
		if (isMobile) {
			setOpenMobile(false)
		}
	}

	return (
		<>
			{/* Shown when expanded */}
			<div className="group-data-[collapsible=icon]:hidden h-full">
				<ChatSidebarExpanded
					active={active}
					onSelect={onSelect}
					teamMembers={teamMembers}
					friends={friends}
					inboxEmails={inboxEmails}
					userId={userId}
					messages={messages}
					viewMode={viewMode}
					recentConversations={recentConversations}
					onTrackConversation={trackConversation}
				/>
			</div>
			{/* Shown when collapsed */}
			<div className="hidden group-data-[collapsible=icon]:block h-full">
				<ChatSidebarCollapsed
					active={active}
					onSelect={handleSelect}
					teamMembers={teamMembers}
					friends={friends}
					inboxEmails={inboxEmails}
					userId={userId}
					messages={messages}
					viewMode={viewMode}
				/>
			</div>
		</>
	)
}
