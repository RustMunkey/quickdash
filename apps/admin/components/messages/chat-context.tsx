"use client"

import * as React from "react"
import type { TeamMessage, TeamMember, Conversation } from "@/app/(dashboard)/messages/types"

const CHAT_STATE_KEY = "quickdash_chat_state"
const VIEW_MODE_KEY = "quickdash_messages_view_mode"
const RECENT_CONVOS_KEY = "quickdash-recent-conversations"

type Friend = {
	id: string
	name: string | null
	username: string | null
	image: string | null
	bio: string | null
}

type InboxEmailSummary = {
	id: string
	fromName: string
	fromEmail: string
	subject: string
	status: "unread" | "read" | "replied"
}

function loadChatState(): Conversation | null {
	if (typeof window === "undefined") return null
	try {
		const stored = localStorage.getItem(CHAT_STATE_KEY)
		if (!stored) return null
		const parsed = JSON.parse(stored)
		// Don't restore channel-type conversations (channels removed)
		if (parsed?.type === "channel") return null
		return parsed
	} catch {
		return null
	}
}

function saveChatState(conversation: Conversation) {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(conversation))
	} catch {}
}

function loadViewMode(): ViewMode {
	if (typeof window === "undefined") return "friends"
	try {
		const stored = localStorage.getItem(VIEW_MODE_KEY)
		if (stored && ["chat", "inbox", "friends"].includes(stored)) {
			return stored as ViewMode
		}
	} catch {}
	return "friends" // Default to friends
}

function saveViewMode(mode: ViewMode) {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(VIEW_MODE_KEY, mode)
	} catch {}
}

// Clear stale recents that reference channels (since channels are now removed)
function clearStaleRecents() {
	if (typeof window === "undefined") return
	try {
		const stored = localStorage.getItem(RECENT_CONVOS_KEY)
		if (!stored) return
		const recents = JSON.parse(stored)
		// Filter out channel-type recents
		const filtered = recents.filter((r: { type: string }) => r.type !== "channel")
		if (filtered.length !== recents.length) {
			localStorage.setItem(RECENT_CONVOS_KEY, JSON.stringify(filtered))
		}
	} catch {}
}

// Clear recent conversations referencing users that no longer exist
function clearStaleRecentUsers(validIds: Set<string>) {
	if (typeof window === "undefined") return
	try {
		const stored = localStorage.getItem(RECENT_CONVOS_KEY)
		if (!stored) return
		const recents = JSON.parse(stored)
		const filtered = recents.filter((r: { type: string; id: string }) =>
			r.type !== "dm" || validIds.has(r.id)
		)
		if (filtered.length !== recents.length) {
			localStorage.setItem(RECENT_CONVOS_KEY, JSON.stringify(filtered))
		}
	} catch {}
}

type ViewMode = "chat" | "inbox" | "friends"

type ChatContextType = {
	active: Conversation
	setActive: (c: Conversation) => void
	messages: TeamMessage[]
	setMessages: React.Dispatch<React.SetStateAction<TeamMessage[]>>
	teamMembers: TeamMember[]
	setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
	friends: Friend[]
	setFriends: React.Dispatch<React.SetStateAction<Friend[]>>
	inboxEmails: InboxEmailSummary[]
	setInboxEmails: React.Dispatch<React.SetStateAction<InboxEmailSummary[]>>
	userId: string
	setUserId: React.Dispatch<React.SetStateAction<string>>
	hydrated: boolean
	isInitialized: boolean
	initialize: (data: {
		messages: TeamMessage[]
		teamMembers: TeamMember[]
		userId: string
		friends?: Friend[]
		inboxEmails?: InboxEmailSummary[]
	}) => void
	viewMode: ViewMode
	setViewMode: (mode: ViewMode) => void
	toggleViewMode: () => void
	// Mobile: whether showing the chat content or the sidebar/list
	mobileShowChat: boolean
	setMobileShowChat: (show: boolean) => void
	openConversation: (c: Conversation) => void
	backToList: () => void
}

const ChatContext = React.createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
	const [messages, setMessages] = React.useState<TeamMessage[]>([])
	const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])
	const [friends, setFriends] = React.useState<Friend[]>([])
	const [inboxEmails, setInboxEmails] = React.useState<InboxEmailSummary[]>([])
	const [userId, setUserId] = React.useState<string>("")
	const [active, setActiveState] = React.useState<Conversation>({ type: "dm", id: "", label: "" })
	const [hydrated, setHydrated] = React.useState(false)
	const [isInitialized, setIsInitialized] = React.useState(false)
	const [viewMode, setViewModeState] = React.useState<ViewMode>("friends")
	const [mobileShowChat, setMobileShowChat] = React.useState(false)

	// Wrap setViewMode to also persist to localStorage
	const setViewMode = React.useCallback((mode: ViewMode) => {
		setViewModeState(mode)
		saveViewMode(mode)
	}, [])

	const toggleViewMode = React.useCallback(() => {
		setViewModeState((prev) => {
			const next = prev === "chat" ? "friends" : prev === "friends" ? "inbox" : "chat"
			saveViewMode(next)
			return next
		})
	}, [])

	// Mobile: open a conversation and switch to chat view
	const openConversation = React.useCallback((c: Conversation) => {
		setActiveState(c)
		saveChatState(c)
		setMobileShowChat(true)
	}, [])

	// Mobile: go back to the list view
	const backToList = React.useCallback(() => {
		setMobileShowChat(false)
	}, [])

	// Load saved chat state and view mode after hydration + clear stale data
	React.useEffect(() => {
		clearStaleRecents()
		const saved = loadChatState()
		if (saved) setActiveState(saved)
		const savedViewMode = loadViewMode()
		setViewModeState(savedViewMode)
		setHydrated(true)
	}, [])

	const setActive = React.useCallback((c: Conversation) => {
		setActiveState(c)
		saveChatState(c)
	}, [])

	const initialize = React.useCallback((data: {
		messages: TeamMessage[]
		teamMembers: TeamMember[]
		userId: string
		friends?: Friend[]
		inboxEmails?: InboxEmailSummary[]
	}) => {
		setMessages(data.messages)
		setTeamMembers(data.teamMembers)
		setUserId(data.userId)
		if (data.friends) setFriends(data.friends)
		if (data.inboxEmails) setInboxEmails(data.inboxEmails)
		setIsInitialized(true)

		// Clear stale active DM if the partner no longer exists in friends/team
		const friendIds = new Set((data.friends || []).map(f => f.id))
		const memberIds = new Set(data.teamMembers.map(m => m.id))
		const validUserIds = new Set([...friendIds, ...memberIds])
		const saved = loadChatState()
		if (saved?.type === "dm" && saved.id) {
			if (!validUserIds.has(saved.id)) {
				setActiveState({ type: "dm", id: "", label: "" })
				try { localStorage.removeItem(CHAT_STATE_KEY) } catch {}
			}
		}
		// Also clean up recent conversations referencing deleted users
		clearStaleRecentUsers(validUserIds)
	}, [])

	return (
		<ChatContext.Provider
			value={{
				active,
				setActive,
				messages,
				setMessages,
				teamMembers,
				setTeamMembers,
				friends,
				setFriends,
				inboxEmails,
				setInboxEmails,
				userId,
				setUserId,
				hydrated,
				isInitialized,
				initialize,
				viewMode,
				setViewMode,
				toggleViewMode,
				mobileShowChat,
				setMobileShowChat,
				openConversation,
				backToList,
			}}
		>
			{children}
		</ChatContext.Provider>
	)
}

export function useChat() {
	const context = React.useContext(ChatContext)
	if (!context) {
		throw new Error("useChat must be used within a ChatProvider")
	}
	return context
}
