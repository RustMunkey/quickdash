"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Notification01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { useNotifications } from "./notification-context"

function formatCount(count: number): string {
	if (count < 1000) return String(count)
	if (count < 1000000) return `${Math.floor(count / 1000)}K+`
	return `${Math.floor(count / 1000000)}M+`
}

interface NotificationBellProps {
	onOpenSidebar?: () => void
}

export function NotificationBell({ onOpenSidebar }: NotificationBellProps) {
	const { unreadCount } = useNotifications()
	const hasUnread = unreadCount > 0

	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative size-8"
			onClick={onOpenSidebar}
			title="Notifications"
		>
			<HugeiconsIcon icon={Notification01Icon} size={16} />
			{hasUnread && (
				<span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
					{formatCount(unreadCount)}
				</span>
			)}
			<span className="sr-only">Notifications</span>
		</Button>
	)
}
