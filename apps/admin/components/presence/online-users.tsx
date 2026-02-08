"use client"

import { usePresence, type PresenceMember } from "@/hooks/use-presence"
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarBadge,
} from "@/components/ui/avatar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

interface OnlineUsersProps {
	className?: string
	maxVisible?: number
	showCount?: boolean
	size?: "sm" | "default" | "lg"
}

export function OnlineUsers({
	className,
	maxVisible = 4,
	showCount = true,
	size = "sm",
}: OnlineUsersProps) {
	const { others, count, isConnected } = usePresence()

	if (!isConnected || count === 0) {
		return null
	}

	const visibleUsers = others.slice(0, maxVisible)
	const remaining = Math.max(0, others.length - maxVisible)

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<AvatarGroup>
				{visibleUsers.map((member) => (
					<Tooltip key={member.id}>
						<TooltipTrigger asChild>
							<Avatar size={size} className="border-2 border-background">
								{member.info.image ? (
									<AvatarImage src={member.info.image} alt={member.info.name} />
								) : null}
								<AvatarFallback>{getInitials(member.info.name)}</AvatarFallback>
								<AvatarBadge className="bg-green-500" />
							</Avatar>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{member.info.name}</p>
							{member.info.role && (
								<p className="text-xs text-muted-foreground capitalize">{member.info.role}</p>
							)}
						</TooltipContent>
					</Tooltip>
				))}
				{remaining > 0 && (
					<AvatarGroupCount className="text-xs">+{remaining}</AvatarGroupCount>
				)}
			</AvatarGroup>
			{showCount && (
				<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
					<span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
					{count} online
				</span>
			)}
		</div>
	)
}
