"use client"

import { usePagePresence, type PageViewer } from "@/hooks/use-page-presence"
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
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon } from "@hugeicons/core-free-icons"

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

interface PageViewersProps {
	resourceType: string
	resourceId: string
	className?: string
	maxVisible?: number
	showLabel?: boolean
}

/**
 * Shows who else is viewing the current resource
 * "X is viewing this" indicator
 */
export function PageViewers({
	resourceType,
	resourceId,
	className,
	maxVisible = 3,
	showLabel = true,
}: PageViewersProps) {
	const { others, othersCount, isConnected } = usePagePresence({
		resourceType,
		resourceId,
	})

	if (!isConnected || othersCount === 0) {
		return null
	}

	const visibleViewers = others.slice(0, maxVisible)
	const remaining = Math.max(0, othersCount - maxVisible)

	const viewerNames = others.slice(0, 2).map((v) => v.name.split(" ")[0])
	const label =
		othersCount === 1
			? `${viewerNames[0]} is viewing`
			: othersCount === 2
				? `${viewerNames.join(" and ")} are viewing`
				: `${viewerNames[0]} and ${othersCount - 1} others are viewing`

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<HugeiconsIcon icon={ViewIcon} size={14} />
			</div>
			<AvatarGroup>
				{visibleViewers.map((viewer) => (
					<Tooltip key={viewer.id}>
						<TooltipTrigger asChild>
							<Avatar size="sm" className="border-2 border-background">
								{viewer.image ? (
									<AvatarImage src={viewer.image} alt={viewer.name} />
								) : null}
								<AvatarFallback className="text-[10px]">{getInitials(viewer.name)}</AvatarFallback>
								<AvatarBadge className="bg-green-500 size-1.5" />
							</Avatar>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{viewer.name}</p>
							{viewer.role && (
								<p className="text-xs text-muted-foreground capitalize">{viewer.role}</p>
							)}
						</TooltipContent>
					</Tooltip>
				))}
				{remaining > 0 && (
					<AvatarGroupCount className="text-[10px]">+{remaining}</AvatarGroupCount>
				)}
			</AvatarGroup>
			{showLabel && (
				<span className="text-xs text-muted-foreground">{label}</span>
			)}
		</div>
	)
}
