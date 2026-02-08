"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	ShoppingBag01Icon,
	Package01Icon,
	CreditCardIcon,
	DeliveryTruck01Icon,
	Alert01Icon,
	CheckmarkCircle01Icon,
	Cancel01Icon,
	MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "./notification-context"

const typeIcons: Record<string, typeof ShoppingBag01Icon> = {
	order: ShoppingBag01Icon,
	inventory: Package01Icon,
	payment: CreditCardIcon,
	shipment: DeliveryTruck01Icon,
	system: Alert01Icon,
}

const typeColors: Record<string, string> = {
	order: "text-blue-500",
	inventory: "text-amber-500",
	payment: "text-green-500",
	shipment: "text-purple-500",
	system: "text-zinc-500",
}

interface NotificationListProps {
	selectedDate?: Date
}

export function NotificationList({ selectedDate }: NotificationListProps) {
	const {
		notifications: allNotifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		dismiss,
		clearAll,
	} = useNotifications()

	const [filter, setFilter] = useState<"all" | "unread">("all")

	// Filter by date if selected
	let notifications = allNotifications
	if (selectedDate) {
		const startOfDay = new Date(selectedDate)
		startOfDay.setHours(0, 0, 0, 0)
		const endOfDay = new Date(selectedDate)
		endOfDay.setHours(23, 59, 59, 999)

		notifications = notifications.filter((n) => {
			const date = new Date(n.createdAt)
			return date >= startOfDay && date <= endOfDay
		})
	}

	// Filter by read status if needed
	const filteredNotifications = filter === "unread"
		? notifications.filter((n) => !n.readAt)
		: notifications

	const handleClick = async (notification: typeof allNotifications[0]) => {
		if (!notification.readAt) {
			await markAsRead(notification.id)
		}
		if (notification.link) {
			const url = new URL(notification.link, window.location.origin)
			url.searchParams.set("highlight", notification.id)
			window.location.href = url.toString()
		}
	}

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-2 py-1.5">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-sidebar-foreground/70">Notifications</span>
					{unreadCount > 0 && (
						<span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
							{unreadCount}
						</span>
					)}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="size-6">
							<HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem onClick={markAllAsRead} disabled={unreadCount === 0}>
							<HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
							Mark all read
						</DropdownMenuItem>
						<DropdownMenuItem onClick={clearAll} disabled={allNotifications.length === 0}>
							<HugeiconsIcon icon={Cancel01Icon} size={14} />
							Clear all
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Filter tabs */}
			<div className="flex gap-1 px-2 pb-2">
				<button
					onClick={() => setFilter("all")}
					className={cn(
						"rounded-md px-2 py-1 text-xs font-medium transition-colors",
						filter === "all"
							? "bg-sidebar-accent text-sidebar-accent-foreground"
							: "text-sidebar-foreground/60 hover:text-sidebar-foreground"
					)}
				>
					All
				</button>
				<button
					onClick={() => setFilter("unread")}
					className={cn(
						"rounded-md px-2 py-1 text-xs font-medium transition-colors",
						filter === "unread"
							? "bg-sidebar-accent text-sidebar-accent-foreground"
							: "text-sidebar-foreground/60 hover:text-sidebar-foreground"
					)}
				>
					Unread
				</button>
			</div>

			{/* Notification items */}
			<div className="flex flex-col">
				{filteredNotifications.length === 0 ? (
					<div className="px-2 py-8 text-center">
						<p className="text-xs text-sidebar-foreground/50">
							{selectedDate
								? `No notifications on ${selectedDate.toLocaleDateString("en-US")}`
								: "No notifications"}
						</p>
					</div>
				) : (
					filteredNotifications.map((notification) => {
						const Icon = typeIcons[notification.type] || Alert01Icon
						const iconColor = typeColors[notification.type] || "text-zinc-500"
						const isUnread = !notification.readAt

						return (
							<div
								key={notification.id}
								className={cn(
									"group relative flex gap-2 px-2 py-2 hover:bg-sidebar-accent/50 cursor-pointer transition-colors",
									isUnread && "bg-sidebar-accent/30"
								)}
								onClick={() => handleClick(notification)}
							>
								{/* Icon with unread indicator */}
								<div className="relative mt-0.5 shrink-0">
									<div className={iconColor}>
										<HugeiconsIcon icon={Icon} size={14} />
									</div>
									{isUnread && (
										<div className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
									)}
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium text-sidebar-foreground leading-tight truncate">
										{notification.title}
									</p>
									{notification.body && (
										<p className="text-[11px] text-sidebar-foreground/60 leading-tight mt-0.5 line-clamp-2">
											{notification.body}
										</p>
									)}
									<p className="text-[10px] text-sidebar-foreground/40 mt-1">
										{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
									</p>
								</div>

								{/* Dismiss button - only show for read notifications */}
								{notification.readAt && (
									<button
										onClick={(e) => {
											e.stopPropagation()
											dismiss(notification.id)
										}}
										className="opacity-0 group-hover:opacity-100 shrink-0 size-5 flex items-center justify-center rounded hover:bg-sidebar-accent transition-opacity"
									>
										<HugeiconsIcon icon={Cancel01Icon} size={12} className="text-sidebar-foreground/50" />
									</button>
								)}
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}
