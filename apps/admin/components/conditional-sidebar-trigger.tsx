"use client"

import { useSidebarMode } from "@/lib/sidebar-mode"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function ConditionalSidebarTrigger({ className }: { className?: string }) {
	const { mode } = useSidebarMode()
	const isMobile = useIsMobile()

	// On mobile in messages mode: show sidebar trigger to open sidebar sheet
	// The sidebar contains the servers bar and conversation list
	if (mode === "messages" && isMobile) {
		return <SidebarTrigger className={className} />
	}

	// Hide trigger in messages mode on desktop since sidebar is not collapsible
	if (mode === "messages") return null

	return <SidebarTrigger className={className} />
}
