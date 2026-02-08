"use client"

import { cn } from "@/lib/utils"

export type PresenceStatus = "online" | "idle" | "dnd" | "offline"

interface StatusIndicatorProps {
	status: PresenceStatus
	size?: "sm" | "md" | "lg"
	className?: string
	showLabel?: boolean
}

const statusConfig: Record<PresenceStatus, { label: string; dotClass: string }> = {
	online: {
		label: "Online",
		dotClass: "bg-green-500",
	},
	idle: {
		label: "Idle",
		dotClass: "bg-yellow-500",
	},
	dnd: {
		label: "Do Not Disturb",
		dotClass: "bg-red-500",
	},
	offline: {
		label: "Invisible",
		dotClass: "bg-gray-500",
	},
}

const sizeConfig = {
	sm: { wrapper: "size-2" },
	md: { wrapper: "size-2.5" },
	lg: { wrapper: "size-3" },
}

export function StatusIndicator({
	status,
	size = "md",
	className,
	showLabel = false,
}: StatusIndicatorProps) {
	const config = statusConfig[status]
	const sizeStyles = sizeConfig[size]

	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			<span className={cn("rounded-full", sizeStyles.wrapper, config.dotClass)} />
			{showLabel && (
				<span className="text-xs text-muted-foreground">{config.label}</span>
			)}
		</span>
	)
}

// For avatar overlay
export function StatusDot({
	status,
	size = "md",
	className,
}: {
	status: PresenceStatus
	size?: "sm" | "md" | "lg"
	className?: string
}) {
	const config = statusConfig[status]
	const sizeStyles = sizeConfig[size]

	return (
		<span
			className={cn(
				"absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full ring-2 ring-sidebar",
				sizeStyles.wrapper,
				config.dotClass,
				className
			)}
		/>
	)
}
