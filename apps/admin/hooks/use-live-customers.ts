"use client"

import { useEffect, useState, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

export interface LiveCustomer {
	id: string
	name: string
	email: string
	image: string | null
	phone: string | null
	createdAt: Date
	orderCount: number
	totalSpent: string
	lastOrderAt: Date | null
	isNew?: boolean
}

interface CustomerCreatedEvent {
	id: string
	name: string
	email: string
	image: string | null
	phone: string | null
	createdAt: string
}

interface CustomerUpdatedEvent {
	id: string
	name?: string
	email?: string
	image?: string | null
	phone?: string | null
	orderCount?: number
	totalSpent?: string
	lastOrderAt?: string | null
}

interface UseLiveCustomersOptions {
	initialCustomers: LiveCustomer[]
}

export function useLiveCustomers({ initialCustomers }: UseLiveCustomersOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [customers, setCustomers] = useState<LiveCustomer[]>(initialCustomers)
	const initialRef = useRef(initialCustomers)

	// Update when server data changes (e.g., pagination)
	useEffect(() => {
		if (JSON.stringify(initialCustomers) !== JSON.stringify(initialRef.current)) {
			setCustomers(initialCustomers)
			initialRef.current = initialCustomers
		}
	}, [initialCustomers])

	useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-customers`
		const channel = pusher.subscribe(channelName)

		// New customer created - prepend to list
		channel.bind("customer:created", (data: CustomerCreatedEvent) => {
			setCustomers((prev) => {
				if (prev.some((c) => c.id === data.id)) return prev
				const newCustomer: LiveCustomer = {
					...data,
					createdAt: new Date(data.createdAt),
					orderCount: 0,
					totalSpent: "0",
					lastOrderAt: null,
					isNew: true,
				}
				return [newCustomer, ...prev]
			})
			// Remove new flag after animation
			setTimeout(() => {
				setCustomers((prev) =>
					prev.map((c) => (c.id === data.id ? { ...c, isNew: false } : c))
				)
			}, 2000)
		})

		// Customer updated - update in place
		channel.bind("customer:updated", (data: CustomerUpdatedEvent) => {
			setCustomers((prev) =>
				prev.map((c) =>
					c.id === data.id
						? {
								...c,
								...(data.name !== undefined && { name: data.name }),
								...(data.email !== undefined && { email: data.email }),
								...(data.image !== undefined && { image: data.image }),
								...(data.phone !== undefined && { phone: data.phone }),
								...(data.orderCount !== undefined && { orderCount: data.orderCount }),
								...(data.totalSpent !== undefined && { totalSpent: data.totalSpent }),
								...(data.lastOrderAt !== undefined && {
									lastOrderAt: data.lastOrderAt ? new Date(data.lastOrderAt) : null,
								}),
						  }
						: c
				)
			)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId])

	return { customers, isConnected }
}
