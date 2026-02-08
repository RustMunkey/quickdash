"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePusher } from "@/components/pusher-provider"

interface UseLiveRefreshOptions {
	enabled?: boolean
}

/**
 * Hook that triggers a page refresh when relevant events occur
 * Use this on analytics/dashboard pages to auto-refresh stats
 */
export function useLiveRefresh({ enabled = true }: UseLiveRefreshOptions = {}) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const router = useRouter()
	const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Debounced refresh to avoid multiple rapid refreshes
	const triggerRefresh = useCallback(() => {
		if (refreshTimeoutRef.current) {
			clearTimeout(refreshTimeoutRef.current)
		}
		refreshTimeoutRef.current = setTimeout(() => {
			router.refresh()
		}, 500)
	}, [router])

	useEffect(() => {
		if (!pusher || !isConnected || !enabled || !workspaceId) return

		const ordersChannelName = `private-workspace-${workspaceId}-orders`
		const inventoryChannelName = `private-workspace-${workspaceId}-inventory`
		const ordersChannel = pusher.subscribe(ordersChannelName)
		const inventoryChannel = pusher.subscribe(inventoryChannelName)

		// Refresh on order events
		ordersChannel.bind("order:created", triggerRefresh)
		ordersChannel.bind("order:updated", triggerRefresh)
		ordersChannel.bind("subscription:created", triggerRefresh)
		ordersChannel.bind("subscription:canceled", triggerRefresh)

		// Refresh on inventory events
		inventoryChannel.bind("inventory:low-stock", triggerRefresh)
		inventoryChannel.bind("inventory:out-of-stock", triggerRefresh)
		inventoryChannel.bind("inventory:restocked", triggerRefresh)

		return () => {
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current)
			}
			ordersChannel.unbind_all()
			inventoryChannel.unbind_all()
			pusher.unsubscribe(ordersChannelName)
			pusher.unsubscribe(inventoryChannelName)
		}
	}, [pusher, isConnected, workspaceId, enabled, triggerRefresh])

	return { isConnected }
}
