"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface MessagesSidebarContextValue {
	open: boolean
	setOpen: (open: boolean) => void
	toggle: () => void
	unreadCount: number
	setUnreadCount: (count: number | ((prev: number) => number)) => void
}

const MessagesSidebarContext = createContext<MessagesSidebarContextValue | null>(null)

export function useMessagesSidebar() {
	const context = useContext(MessagesSidebarContext)
	if (!context) {
		throw new Error("useMessagesSidebar must be used within a MessagesSidebarProvider")
	}
	return context
}

export function MessagesSidebarProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false)
	const [unreadCount, setUnreadCount] = useState(0)

	const toggle = () => setOpen((prev) => !prev)

	return (
		<MessagesSidebarContext.Provider
			value={{ open, setOpen, toggle, unreadCount, setUnreadCount }}
		>
			{children}
		</MessagesSidebarContext.Provider>
	)
}
