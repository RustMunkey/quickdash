"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

export interface Notification {
	id: string
	type: string
	title: string
	body?: string
	link?: string
	metadata?: Record<string, unknown>
	createdAt: string
	readAt?: string
}

export interface UseLiveNotificationsOptions {
	userId: string
	onNotification?: (notification: Notification) => void
	enabled?: boolean
}

/**
 * Hook for receiving real-time notifications
 * Subscribes to private-user-{userId} channel
 */
export function useLiveNotifications({
	userId,
	onNotification,
	enabled = true,
}: UseLiveNotificationsOptions) {
	const { pusher, isConnected } = usePusher()
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [unreadCount, setUnreadCount] = useState(0)
	const callbackRef = useRef(onNotification)

	// Keep callback ref up to date
	useEffect(() => {
		callbackRef.current = onNotification
	})

	useEffect(() => {
		if (!pusher || !isConnected || !enabled || !userId) return

		const channel = pusher.subscribe(`private-user-${userId}`)

		channel.bind("notification", (data: Notification) => {
			setNotifications((prev) => [data, ...prev])
			if (!data.readAt) {
				setUnreadCount((prev) => prev + 1)
			}
			callbackRef.current?.(data)
		})

		// Sync unread count from server
		channel.bind("notifications:sync", (data: { unreadCount: number; notifications: Notification[] }) => {
			setUnreadCount(data.unreadCount)
			setNotifications(data.notifications)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(`private-user-${userId}`)
		}
	}, [pusher, isConnected, enabled, userId])

	const markAsRead = useCallback((notificationId: string) => {
		setNotifications((prev) =>
			prev.map((n) =>
				n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
			)
		)
		setUnreadCount((prev) => Math.max(0, prev - 1))
	}, [])

	const markAllAsRead = useCallback(() => {
		setNotifications((prev) =>
			prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
		)
		setUnreadCount(0)
	}, [])

	const clearAll = useCallback(() => {
		setNotifications([])
		setUnreadCount(0)
	}, [])

	return {
		notifications,
		unreadCount,
		hasUnread: unreadCount > 0,
		markAsRead,
		markAllAsRead,
		clearAll,
		isConnected,
	}
}
