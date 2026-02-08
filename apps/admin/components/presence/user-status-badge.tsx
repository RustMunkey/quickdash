"use client"

import { cn } from "@/lib/utils"

type Status = "online" | "away" | "busy" | "offline"

const statusColors: Record<Status, string> = {
	online: "bg-green-500",
	away: "bg-yellow-500",
	busy: "bg-red-500",
	offline: "bg-gray-400",
}

interface UserStatusBadgeProps {
	status: Status
	className?: string
	size?: "sm" | "md" | "lg"
}

export function UserStatusBadge({ status, className, size = "md" }: UserStatusBadgeProps) {
	const sizeClasses = {
		sm: "size-2",
		md: "size-2.5",
		lg: "size-3",
	}

	return (
		<span
			className={cn(
				"inline-block rounded-full ring-2 ring-background",
				statusColors[status],
				sizeClasses[size],
				className
			)}
			aria-label={`Status: ${status}`}
		/>
	)
}
