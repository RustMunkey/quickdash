"use client"

import { useEffect, useState, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

// Full inventory item for live updates (matches table schema)
export interface LiveInventoryItem {
	id: string
	variantId: string
	quantity: number
	reservedQuantity: number
	lowStockThreshold: number | null
	updatedAt: Date
	variantName: string
	variantSku: string
	productName: string
	productId: string
	isUpdated?: boolean // Flag for animation
}

export interface InventoryAlertEvent {
	productId: string
	productName: string
	sku: string
	currentStock: number
	threshold: number
}

export interface UseLiveInventoryOptions {
	initialItems: LiveInventoryItem[]
	onLowStock?: (data: InventoryAlertEvent) => void
	onOutOfStock?: (data: InventoryAlertEvent) => void
	onRestocked?: (data: InventoryAlertEvent) => void
	enabled?: boolean
}

/**
 * Hook for managing live inventory updates
 * Returns items array that updates in real-time
 */
export function useLiveInventory({
	initialItems,
	onLowStock,
	onOutOfStock,
	onRestocked,
	enabled = true,
}: UseLiveInventoryOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [items, setItems] = useState<LiveInventoryItem[]>(initialItems)
	const initialItemsRef = useRef(initialItems)
	const callbacksRef = useRef({ onLowStock, onOutOfStock, onRestocked })

	// Keep callbacks up to date
	useEffect(() => {
		callbacksRef.current = { onLowStock, onOutOfStock, onRestocked }
	})

	// Update when server data changes (e.g., pagination)
	useEffect(() => {
		if (JSON.stringify(initialItems) !== JSON.stringify(initialItemsRef.current)) {
			setItems(initialItems)
			initialItemsRef.current = initialItems
		}
	}, [initialItems])

	useEffect(() => {
		if (!pusher || !isConnected || !enabled || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-inventory`
		const channel = pusher.subscribe(channelName)

		// Item updated - update in place
		channel.bind("inventory:updated", (data: LiveInventoryItem) => {
			setItems((prev) =>
				prev.map((item) =>
					item.id === data.id
						? { ...data, updatedAt: new Date(data.updatedAt), isUpdated: true }
						: item
				)
			)
			// Remove animation flag after 2 seconds
			setTimeout(() => {
				setItems((prev) =>
					prev.map((item) =>
						item.id === data.id ? { ...item, isUpdated: false } : item
					)
				)
			}, 2000)
		})

		// Alert events for callbacks
		channel.bind("inventory:low-stock", (data: InventoryAlertEvent) => {
			callbacksRef.current.onLowStock?.(data)
		})

		channel.bind("inventory:out-of-stock", (data: InventoryAlertEvent) => {
			callbacksRef.current.onOutOfStock?.(data)
		})

		channel.bind("inventory:restocked", (data: InventoryAlertEvent) => {
			callbacksRef.current.onRestocked?.(data)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, enabled])

	return { items, isConnected }
}
