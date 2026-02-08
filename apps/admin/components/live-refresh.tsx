"use client"

import { useLiveRefresh } from "@/hooks/use-live-analytics"

/**
 * Drop this component into any page to enable auto-refresh on real-time events.
 * It renders nothing - just subscribes to Pusher and triggers router.refresh()
 */
export function LiveRefresh() {
	useLiveRefresh()
	return null
}
