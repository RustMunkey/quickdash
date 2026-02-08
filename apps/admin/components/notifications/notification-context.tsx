"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { usePusher } from "@/components/pusher-provider"
import {
	getNotifications,
	getUnreadCount,
	markNotificationRead as markReadAction,
	markAllNotificationsRead as markAllReadAction,
	dismissNotification as dismissAction,
	clearAllNotifications as clearAllAction,
} from "@/app/(dashboard)/settings/notifications/actions"

export interface Notification {
	id: string
	type: string
	title: string
	body: string | null
	link: string | null
	readAt: Date | string | null
	dismissedAt?: Date | string | null
	createdAt: Date | string
}

interface NotificationContextValue {
	notifications: Notification[]
	unreadCount: number
	isLoading: boolean
	markAsRead: (id: string) => Promise<void>
	markAllAsRead: () => Promise<void>
	dismiss: (id: string) => Promise<void>
	clearAll: () => Promise<void>
	refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
	const context = useContext(NotificationContext)
	if (!context) {
		throw new Error("useNotifications must be used within a NotificationProvider")
	}
	return context
}

interface NotificationProviderProps {
	userId: string
	children: ReactNode
}

export function NotificationProvider({ userId, children }: NotificationProviderProps) {
	const { pusher, isConnected } = usePusher()
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [unreadCount, setUnreadCount] = useState(0)
	const [isLoading, setIsLoading] = useState(true)

	// Load notifications from DB
	const loadNotifications = useCallback(async () => {
		try {
			const [data, count] = await Promise.all([
				getNotifications(50, true),
				getUnreadCount(),
			])
			setNotifications(data)
			setUnreadCount(count)
		} catch (error) {
			console.error("Failed to load notifications:", error)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// Initial load
	useEffect(() => {
		loadNotifications()
	}, [loadNotifications])

	// Subscribe to Pusher for real-time updates
	useEffect(() => {
		if (!pusher || !isConnected || !userId) return

		const channel = pusher.subscribe(`private-user-${userId}`)

		channel.bind("notification", (data: Notification) => {
			setNotifications((prev) => [data, ...prev])
			if (!data.readAt) {
				setUnreadCount((prev) => prev + 1)
			}
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(`private-user-${userId}`)
		}
	}, [pusher, isConnected, userId])

	const markAsRead = useCallback(async (id: string) => {
		// Optimistic update
		setNotifications((prev) =>
			prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
		)
		setUnreadCount((prev) => Math.max(0, prev - 1))

		// Persist to DB
		await markReadAction(id)
	}, [])

	const markAllAsRead = useCallback(async () => {
		// Optimistic update
		setNotifications((prev) =>
			prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
		)
		setUnreadCount(0)

		// Persist to DB
		await markAllReadAction()
	}, [])

	const dismiss = useCallback(async (id: string) => {
		// Only dismiss read notifications - unread ones should stay
		const notification = notifications.find((n) => n.id === id)
		if (!notification || !notification.readAt) {
			return // Don't dismiss unread notifications
		}

		// Optimistic update - remove from list
		setNotifications((prev) => prev.filter((n) => n.id !== id))

		// Persist to DB
		await dismissAction(id)
	}, [notifications])

	const clearAll = useCallback(async () => {
		// Optimistic update
		setNotifications([])
		setUnreadCount(0)

		// Persist to DB
		await clearAllAction()
	}, [])

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				unreadCount,
				isLoading,
				markAsRead,
				markAllAsRead,
				dismiss,
				clearAll,
				refresh: loadNotifications,
			}}
		>
			{children}
		</NotificationContext.Provider>
	)
}
