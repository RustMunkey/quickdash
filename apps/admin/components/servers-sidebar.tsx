"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useSidebarMode } from "@/lib/sidebar-mode"

interface Server {
	id: string
	name: string
	icon?: string
	unreadCount?: number
}

// Servers come from the database - user-created via "Add a Server"
const SERVERS: Server[] = []

function getInitials(name: string) {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase()
}

// Notification badge - styled like StatusDot but for counts
function NotificationBadge({ count }: { count: number }) {
	if (count <= 0) return null

	return (
		<span className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-medium text-primary-foreground ring-2 ring-sidebar">
			{count > 99 ? "99+" : count}
		</span>
	)
}

function ServerIcon({
	server,
	isActive,
	onClick,
}: {
	server: Server
	isActive: boolean
	onClick: () => void
}) {
	const initials = getInitials(server.name)

	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					className="relative group flex items-center justify-center w-full"
				>
					{/* Active indicator pill */}
					<div
						className={cn(
							"absolute left-0 w-1 rounded-r-full bg-foreground transition-all duration-200",
							isActive ? "h-8" : "h-0 group-hover:h-4"
						)}
					/>

					{/* Server avatar */}
					<div className="relative overflow-visible">
						<Avatar className="size-10 rounded-lg transition-all duration-200">
							{server.icon && <AvatarImage src={server.icon} alt={server.name} />}
							<AvatarFallback className={cn(
								"rounded-lg text-sm font-semibold transition-colors duration-200",
								isActive
									? "bg-primary text-primary-foreground"
									: "bg-muted text-foreground"
							)}>
								{initials}
							</AvatarFallback>
						</Avatar>
						<NotificationBadge count={server.unreadCount || 0} />
					</div>
				</button>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				<p className="font-medium">{server.name}</p>
			</TooltipContent>
		</Tooltip>
	)
}

function HomeButton({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					className="relative group flex items-center justify-center w-full"
				>
					{/* Active indicator pill */}
					<div
						className={cn(
							"absolute left-0 w-1 rounded-r-full bg-foreground transition-all duration-200",
							isActive ? "h-8" : "h-0 group-hover:h-4"
						)}
					/>

					<Avatar className="size-10 rounded-lg transition-all duration-200">
						<AvatarFallback className={cn(
							"rounded-lg transition-colors duration-200",
							isActive
								? "bg-primary"
								: "bg-foreground"
						)}>
							<img src="/logos/coffee-white.png" alt="Quickdash" className="size-6 dark:hidden" />
							<img src="/logos/coffee.png" alt="Quickdash" className="size-6 hidden dark:block" />
						</AvatarFallback>
					</Avatar>
				</button>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				<p className="font-medium">Home</p>
			</TooltipContent>
		</Tooltip>
	)
}

function AddServerButton({ onClick }: { onClick: () => void }) {
	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					className="relative group flex items-center justify-center w-full"
				>
					<Avatar className="size-10 rounded-lg transition-all duration-200">
						<AvatarFallback className="rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
							<HugeiconsIcon icon={Add01Icon} size={18} />
						</AvatarFallback>
					</Avatar>
				</button>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				<p className="font-medium">Add a Server</p>
			</TooltipContent>
		</Tooltip>
	)
}

export function ServersSidebar() {
	const { exitMessagesMode } = useSidebarMode()
	const [activeServer, setActiveServer] = React.useState<string>("home")

	const isHome = activeServer === "home"

	return (
		<aside className="shrink-0 w-16 h-screen flex flex-col items-center py-3 bg-sidebar border-r border-sidebar-border overflow-visible">
			{/* Home button */}
			<HomeButton
				isActive={isHome}
				onClick={() => {
					setActiveServer("home")
					exitMessagesMode()
				}}
			/>

			<div className="w-8 my-2">
				<Separator className="bg-sidebar-border" />
			</div>

			{/* Server list */}
			<div className="min-h-0 flex-1 flex flex-col items-center gap-2 w-full overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{SERVERS.map((server) => (
					<ServerIcon
						key={server.id}
						server={server}
						isActive={activeServer === server.id}
						onClick={() => {
							// Just switch active server context - don't navigate
							setActiveServer(server.id)
						}}
					/>
				))}
			</div>

			<div className="w-8 my-2">
				<Separator className="bg-sidebar-border" />
			</div>

			{/* Add server button */}
			<AddServerButton onClick={() => {
				// TODO: Open add server dialog
			}} />
		</aside>
	)
}
