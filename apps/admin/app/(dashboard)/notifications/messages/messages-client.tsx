"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { ChatTab } from "./chat-tab"
import { InboxTab } from "./inbox-tab"
import { FriendsTab } from "./friends-tab"
import { useChat } from "@/components/messages"
import { useSidebarMode } from "@/lib/sidebar-mode"
import type { TeamMessage, TeamMember, InboxEmail } from "./types"

const PREVIOUS_PATH_KEY = "quickdash_messages_previous_path"

type Friend = {
	id: string
	name: string | null
	username: string | null
	image: string | null
	bio: string | null
}

type DMConversation = {
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

export function MessagesClient({
	messages,
	userId,
	userName,
	userImage,
	teamMembers,
	inboxEmails,
	selectedEmailId,
	friends,
	dmConversations,
}: {
	messages: TeamMessage[]
	userId: string
	userName: string
	userImage: string | null
	teamMembers: TeamMember[]
	inboxEmails: InboxEmail[]
	selectedEmailId?: string
	friends: Friend[]
	dmConversations: DMConversation[]
}) {
	const { setMode, setPreviousPath } = useSidebarMode()
	const { initialize, viewMode, setViewMode } = useChat()
	const hasSetPrevPath = useRef(false)
	const pathname = usePathname()

	// Initialize chat context with data from server
	useEffect(() => {
		initialize({ messages, teamMembers, userId })
	}, [messages, teamMembers, userId, initialize])

	// Auto-switch to inbox if a specific email is requested
	useEffect(() => {
		if (selectedEmailId) {
			setViewMode("inbox")
		}
	}, [selectedEmailId, setViewMode])

	// Enter messages mode and set previous path (only once)
	useEffect(() => {
		// Set messages mode - will stay until user explicitly exits
		setMode("messages")

		// Set previous path for back navigation (only once)
		if (!hasSetPrevPath.current) {
			const storedPrevPath = sessionStorage.getItem(PREVIOUS_PATH_KEY)
			if (storedPrevPath && storedPrevPath !== pathname) {
				setPreviousPath(storedPrevPath)
				sessionStorage.removeItem(PREVIOUS_PATH_KEY)
			} else {
				setPreviousPath("/")
			}
			hasSetPrevPath.current = true
		}
		// Note: We intentionally do NOT reset mode on unmount
		// The user must click the exit button to leave messages mode
	}, [setMode, setPreviousPath, pathname])

	function handleTabChange(value: "chat" | "inbox" | "friends") {
		setViewMode(value)
	}

	// Render based on view mode
	if (viewMode === "inbox") {
		return (
			<InboxTab
				emails={inboxEmails}
				activeTab={viewMode}
				onTabChange={handleTabChange}
				selectedEmailId={selectedEmailId}
			/>
		)
	}

	if (viewMode === "friends") {
		return (
			<FriendsTab
				userId={userId}
				userName={userName}
				userImage={userImage}
				onTabChange={handleTabChange}
				initialFriends={friends}
				initialConversations={dmConversations}
			/>
		)
	}

	return (
		<ChatTab
			userId={userId}
			userName={userName}
			userImage={userImage}
			onTabChange={handleTabChange}
		/>
	)
}
