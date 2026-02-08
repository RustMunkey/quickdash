"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

interface MessageToastProps {
	id: string | number
	senderName: string
	body: string
	messageId: string
	channel: string
}

const MAX_MESSAGE_LENGTH = 150

export function MessageToast({ id, senderName, body, messageId, channel }: MessageToastProps) {
	const [expanded, setExpanded] = useState(false)
	const router = useRouter()

	const truncatedBody = body.length > MAX_MESSAGE_LENGTH
		? body.slice(0, MAX_MESSAGE_LENGTH) + "..."
		: body

	return (
		<div
			className={`w-[356px] cursor-pointer select-none bg-popover text-popover-foreground border rounded-md shadow-lg py-2 px-3`}
			onClick={(e) => {
				if ((e.target as HTMLElement).closest("button")) return
				setExpanded(!expanded)
			}}
		>
			{/* Header - always visible */}
			<div className="flex items-center gap-1.5">
				<HugeiconsIcon icon={Mail01Icon} size={14} className="shrink-0 text-muted-foreground" />
				<span className="font-medium text-xs leading-none">{senderName}</span>
			</div>

			{/* Expanded content */}
			{expanded && (
				<div className="flex flex-col gap-2 pt-1.5">
					<p className="text-xs text-muted-foreground leading-snug">
						{truncatedBody}
					</p>
					<div className="flex items-center justify-end gap-1.5">
						<Button
							size="sm"
							variant="outline"
							className="h-6 text-[10px] px-2"
							onClick={() => toast.dismiss(id)}
						>
							Dismiss
						</Button>
						<Button
							size="sm"
							className="h-6 text-[10px] px-2"
							onClick={() => {
								toast.dismiss(id)
								router.push(`/messages?highlight=${messageId}&channel=${channel}`)
							}}
						>
							View
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

export function showMessageToast(data: {
	senderName: string
	body: string
	messageId: string
	channel: string
}) {
	toast.custom(
		(id) => (
			<MessageToast
				id={id}
				senderName={data.senderName}
				body={data.body}
				messageId={data.messageId}
				channel={data.channel}
			/>
		),
		{
			duration: 10000,
		}
	)
}
