"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { usePusher } from "@/components/pusher-provider"

export interface StatValue {
	value: number
	change: number
}

export interface LiveStats {
	revenue: StatValue
	orderCount: StatValue
	mrr: StatValue
	pendingOrders: number
}

export interface UseLiveStatsOptions {
	initialStats: LiveStats
}

interface OrderCreatedEvent {
	id: string
	orderNumber: string
	total: string
	status: string
}

interface OrderUpdatedEvent {
	orderId: string
	status: string
	previousStatus?: string
}

interface SubscriptionEvent {
	subscriptionId: string
	amount?: number
}

/**
 * Hook that provides live-updating dashboard stats
 * Updates values in place when order/subscription events occur
 */
export function useLiveStats({ initialStats }: UseLiveStatsOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [stats, setStats] = useState<LiveStats>(initialStats)
	const initialRef = useRef(initialStats)

	// Update when server-side initial data changes
	useEffect(() => {
		if (JSON.stringify(initialStats) !== JSON.stringify(initialRef.current)) {
			setStats(initialStats)
			initialRef.current = initialStats
		}
	}, [initialStats])

	// Incrementally update stats based on events
	const handleOrderCreated = useCallback((data: OrderCreatedEvent) => {
		const amount = parseFloat(data.total) || 0
		setStats((prev) => ({
			...prev,
			revenue: {
				...prev.revenue,
				value: prev.revenue.value + amount,
			},
			orderCount: {
				...prev.orderCount,
				value: prev.orderCount.value + 1,
			},
			pendingOrders: data.status === "pending"
				? prev.pendingOrders + 1
				: prev.pendingOrders,
		}))
	}, [])

	const handleOrderUpdated = useCallback((data: OrderUpdatedEvent) => {
		setStats((prev) => {
			let pendingDelta = 0
			// If moved FROM pending, decrement
			if (data.previousStatus === "pending" && data.status !== "pending") {
				pendingDelta = -1
			}
			// If moved TO pending, increment
			if (data.previousStatus !== "pending" && data.status === "pending") {
				pendingDelta = 1
			}

			if (pendingDelta === 0) return prev

			return {
				...prev,
				pendingOrders: Math.max(0, prev.pendingOrders + pendingDelta),
			}
		})
	}, [])

	const handleSubscriptionCreated = useCallback((data: SubscriptionEvent) => {
		const amount = (data.amount || 0) / 100 // Convert cents to dollars
		setStats((prev) => ({
			...prev,
			mrr: {
				...prev.mrr,
				value: prev.mrr.value + amount,
			},
		}))
	}, [])

	const handleSubscriptionCanceled = useCallback((data: SubscriptionEvent) => {
		const amount = (data.amount || 0) / 100
		setStats((prev) => ({
			...prev,
			mrr: {
				...prev.mrr,
				value: Math.max(0, prev.mrr.value - amount),
			},
		}))
	}, [])

	useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-orders`
		const channel = pusher.subscribe(channelName)

		channel.bind("order:created", handleOrderCreated)
		channel.bind("order:updated", handleOrderUpdated)
		channel.bind("subscription:created", handleSubscriptionCreated)
		channel.bind("subscription:canceled", handleSubscriptionCanceled)

		return () => {
			channel.unbind("order:created", handleOrderCreated)
			channel.unbind("order:updated", handleOrderUpdated)
			channel.unbind("subscription:created", handleSubscriptionCreated)
			channel.unbind("subscription:canceled", handleSubscriptionCanceled)
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, handleOrderCreated, handleOrderUpdated, handleSubscriptionCreated, handleSubscriptionCanceled])

	return { stats, isConnected }
}
