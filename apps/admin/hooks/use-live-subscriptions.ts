"use client"

import { useEffect, useState, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

export interface LiveSubscription {
	id: string
	userId: string
	status: string
	frequency: string
	pricePerDelivery: string
	nextDeliveryAt: Date | null
	lastDeliveryAt: Date | null
	totalDeliveries: number | null
	cancelledAt: Date | null
	cancellationReason: string | null
	createdAt: Date
	customerName: string | null
	customerEmail: string | null
	isNew?: boolean
}

interface SubscriptionCreatedEvent {
	id: string
	userId: string
	status: string
	frequency: string
	pricePerDelivery: string
	nextDeliveryAt: string | null
	createdAt: string
	customerName: string | null
	customerEmail: string | null
}

interface SubscriptionUpdatedEvent {
	id: string
	status?: string
	frequency?: string
	pricePerDelivery?: string
	nextDeliveryAt?: string | null
	lastDeliveryAt?: string | null
	totalDeliveries?: number | null
	cancelledAt?: string | null
	cancellationReason?: string | null
}

interface UseLiveSubscriptionsOptions {
	initialSubscriptions: LiveSubscription[]
}

export function useLiveSubscriptions({ initialSubscriptions }: UseLiveSubscriptionsOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [subscriptions, setSubscriptions] = useState<LiveSubscription[]>(initialSubscriptions)
	const initialRef = useRef(initialSubscriptions)

	// Update when server data changes (e.g., pagination)
	useEffect(() => {
		if (JSON.stringify(initialSubscriptions) !== JSON.stringify(initialRef.current)) {
			setSubscriptions(initialSubscriptions)
			initialRef.current = initialSubscriptions
		}
	}, [initialSubscriptions])

	useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-subscriptions`
		const channel = pusher.subscribe(channelName)

		// New subscription created - prepend to list
		channel.bind("subscription:created", (data: SubscriptionCreatedEvent) => {
			setSubscriptions((prev) => {
				if (prev.some((s) => s.id === data.id)) return prev
				const newSubscription: LiveSubscription = {
					...data,
					createdAt: new Date(data.createdAt),
					nextDeliveryAt: data.nextDeliveryAt ? new Date(data.nextDeliveryAt) : null,
					lastDeliveryAt: null,
					totalDeliveries: 0,
					cancelledAt: null,
					cancellationReason: null,
					isNew: true,
				}
				return [newSubscription, ...prev]
			})
			// Remove new flag after animation
			setTimeout(() => {
				setSubscriptions((prev) =>
					prev.map((s) => (s.id === data.id ? { ...s, isNew: false } : s))
				)
			}, 2000)
		})

		// Subscription updated - update in place
		channel.bind("subscription:updated", (data: SubscriptionUpdatedEvent) => {
			setSubscriptions((prev) =>
				prev.map((s) =>
					s.id === data.id
						? {
								...s,
								...(data.status !== undefined && { status: data.status }),
								...(data.frequency !== undefined && { frequency: data.frequency }),
								...(data.pricePerDelivery !== undefined && { pricePerDelivery: data.pricePerDelivery }),
								...(data.nextDeliveryAt !== undefined && {
									nextDeliveryAt: data.nextDeliveryAt ? new Date(data.nextDeliveryAt) : null,
								}),
								...(data.lastDeliveryAt !== undefined && {
									lastDeliveryAt: data.lastDeliveryAt ? new Date(data.lastDeliveryAt) : null,
								}),
								...(data.totalDeliveries !== undefined && { totalDeliveries: data.totalDeliveries }),
								...(data.cancelledAt !== undefined && {
									cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : null,
								}),
								...(data.cancellationReason !== undefined && { cancellationReason: data.cancellationReason }),
						  }
						: s
				)
			)
		})

		// Subscription canceled - update status
		channel.bind("subscription:canceled", (data: { id: string; cancelledAt: string; reason?: string }) => {
			setSubscriptions((prev) =>
				prev.map((s) =>
					s.id === data.id
						? {
								...s,
								status: "cancelled",
								cancelledAt: new Date(data.cancelledAt),
								cancellationReason: data.reason ?? null,
						  }
						: s
				)
			)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId])

	return { subscriptions, isConnected }
}
