"use client"

import { useEffect, useState, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

// Full order data for live updates (matches table schema)
export interface LiveOrder {
	id: string
	orderNumber: string
	status: string
	total: string
	customerName: string | null
	customerEmail: string | null
	createdAt: Date
	isNew?: boolean // Flag for animation
}

export interface SubscriptionEvent {
	subscriptionId: string
	customerEmail: string
	customerName: string | null
	product: string
	status?: string
}

export interface OrderUpdateEvent {
	orderId: string
	status: string
}

export interface UseLiveOrdersOptions {
	initialOrders: LiveOrder[]
	enabled?: boolean
}

/**
 * Hook for managing live order updates
 * Returns orders array that updates in real-time
 */
export function useLiveOrders({
	initialOrders,
	enabled = true,
}: UseLiveOrdersOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [orders, setOrders] = useState<LiveOrder[]>(initialOrders)
	const initialOrdersRef = useRef(initialOrders)

	// Update when server data changes (e.g., pagination)
	useEffect(() => {
		if (JSON.stringify(initialOrders) !== JSON.stringify(initialOrdersRef.current)) {
			setOrders(initialOrders)
			initialOrdersRef.current = initialOrders
		}
	}, [initialOrders])

	useEffect(() => {
		if (!pusher || !isConnected || !enabled || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-orders`
		const channel = pusher.subscribe(channelName)

		// New order created - prepend to list
		channel.bind("order:created", (data: LiveOrder) => {
			setOrders((prev) => {
				// Don't add duplicates
				if (prev.some((o) => o.id === data.id)) return prev
				// Add new order at the top with animation flag
				return [{ ...data, createdAt: new Date(data.createdAt), isNew: true }, ...prev]
			})
			// Remove isNew flag after animation
			setTimeout(() => {
				setOrders((prev) =>
					prev.map((o) => (o.id === data.id ? { ...o, isNew: false } : o))
				)
			}, 2000)
		})

		// Order status updated - update in place
		channel.bind("order:updated", (data: OrderUpdateEvent) => {
			setOrders((prev) =>
				prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
			)
		})

		// Subscription events (show as orders too)
		channel.bind("subscription:created", (data: SubscriptionEvent & { amount: number; currency: string }) => {
			const newOrder: LiveOrder = {
				id: data.subscriptionId,
				orderNumber: data.subscriptionId.slice(0, 8).toUpperCase(),
				status: "confirmed",
				total: (data.amount / 100).toFixed(2),
				customerName: data.customerName,
				customerEmail: data.customerEmail,
				createdAt: new Date(),
				isNew: true,
			}
			setOrders((prev) => {
				if (prev.some((o) => o.id === newOrder.id)) return prev
				return [newOrder, ...prev]
			})
			setTimeout(() => {
				setOrders((prev) =>
					prev.map((o) => (o.id === newOrder.id ? { ...o, isNew: false } : o))
				)
			}, 2000)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, enabled])

	return { orders, isConnected }
}
