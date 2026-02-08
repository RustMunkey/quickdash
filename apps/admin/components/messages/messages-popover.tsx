"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/lib/auth-client"
import { usePusher } from "@/components/pusher-provider"
import { getUnreadCount, getRecentMessages } from "@/app/(dashboard)/messages/actions"
import { formatDistanceToNow } from "date-fns"

interface RecentMessage {
	id: string
	content: string | null
	createdAt: Date
	sender: {
		id: string | null
		name: string
		image: string | null
	}
	channel: string
}

function formatCount(count: number): string {
	if (count < 1000) return String(count)
	if (count < 1000000) return `${Math.floor(count / 1000)}K+`
	return `${Math.floor(count / 1000000)}M+`
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

export function MessagesPopover() {
	const router = useRouter()
	const { data: session } = useSession()
	const { pusher } = usePusher()
	const [unreadCount, setUnreadCount] = React.useState(0)
	const [recentMessages, setRecentMessages] = React.useState<RecentMessage[]>([])
	const [open, setOpen] = React.useState(false)

	// Load initial unread count
	React.useEffect(() => {
		if (!session?.user?.id) return
		getUnreadCount(session.user.id).then(setUnreadCount)
	}, [session?.user?.id])

	// Load recent messages when popover opens
	React.useEffect(() => {
		if (open && session?.user?.id) {
			getRecentMessages(session.user.id, 5).then(setRecentMessages).catch(() => {})
		}
	}, [open, session?.user?.id])

	// Listen for new messages via Pusher
	React.useEffect(() => {
		if (!pusher || !session?.user?.id) return

		const channelName = `private-user-${session.user.id}`
		const channel = pusher.subscribe(channelName)

		const handleNewMessage = (data: { senderId: string }) => {
			// Don't count/notify for own messages
			if (data.senderId === session.user.id) return

			setUnreadCount((c) => c + 1)

			// Play notification sound
			const audio = new Audio("/sounds/message.mp3")
			audio.volume = 0.5
			audio.play().catch(() => {
				// Ignore autoplay errors (browser policy)
			})
		}

		channel.bind("new-message", handleNewMessage)

		return () => {
			// Only unbind our handler, don't unsubscribe the channel
			// Other components (chat-tab) also use this channel
			channel.unbind("new-message", handleNewMessage)
		}
	}, [pusher, session?.user?.id])

	const handleViewAll = () => {
		setOpen(false)
		router.push("/messages")
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative size-8"
				>
					<HugeiconsIcon icon={Mail01Icon} size={16} />
					{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
							{formatCount(unreadCount)}
						</span>
					)}
					<span className="sr-only">Messages</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<h4 className="font-semibold text-sm">Messages</h4>
					{unreadCount > 0 && (
						<span className="text-xs text-muted-foreground">
							{unreadCount} unread
						</span>
					)}
				</div>

				<div className="max-h-80 overflow-y-auto">
					{recentMessages.length === 0 ? (
						<div className="py-8 text-center text-sm text-muted-foreground">
							No recent messages
						</div>
					) : (
						<div className="divide-y">
							{recentMessages.map((message) => (
								<button
									key={message.id}
									type="button"
									className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
									onClick={() => {
										setOpen(false)
										router.push("/messages")
									}}
								>
									<Avatar className="h-8 w-8 shrink-0">
										{message.sender.image && (
											<AvatarImage src={message.sender.image} alt={message.sender.name} />
										)}
										<AvatarFallback className="text-xs">
											{getInitials(message.sender.name)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="font-medium text-sm truncate">
												{message.sender.name}
											</span>
											{message.channel && (
												<span className="text-xs text-muted-foreground">
													#{message.channel}
												</span>
											)}
										</div>
										<p className="text-sm text-muted-foreground truncate">
											{message.content}
										</p>
										<p className="text-xs text-muted-foreground mt-0.5">
											{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
										</p>
									</div>
								</button>
							))}
						</div>
					)}
				</div>

				<Separator />
				<div className="p-2">
					<Button
						variant="ghost"
						className="w-full justify-between"
						onClick={handleViewAll}
					>
						View all messages
						<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
