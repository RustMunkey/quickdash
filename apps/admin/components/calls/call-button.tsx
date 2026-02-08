"use client"

import { useState } from "react"
import { useCallOptional } from "./call-provider"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Call02Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import type { CallType } from "@/app/(dashboard)/calls/types"

type CallButtonProps = {
	participantIds: string[]
	chatChannel?: string
	variant?: "icon" | "default"
	type?: CallType
	className?: string
}

export function CallButton({
	participantIds,
	chatChannel,
	variant = "icon",
	type = "video",
	className,
}: CallButtonProps) {
	const call = useCallOptional()
	const [isStarting, setIsStarting] = useState(false)

	if (!call) return null

	const handleClick = async () => {
		if (call.status !== "idle") {
			toast.error("Already in a call")
			return
		}

		setIsStarting(true)
		try {
			await call.startCall(participantIds, type, chatChannel)
		} catch (err) {
			toast.error("Failed to start call")
		} finally {
			setIsStarting(false)
		}
	}

	const icon = type === "video" ? Video01Icon : Call02Icon
	const label = type === "video" ? "Video call" : "Voice call"

	if (variant === "icon") {
		return (
			<Button
				variant="ghost"
				size="icon"
				className={className}
				onClick={handleClick}
				disabled={isStarting || call.status !== "idle"}
				title={label}
			>
				<HugeiconsIcon icon={icon} size={16} />
				<span className="sr-only">{label}</span>
			</Button>
		)
	}

	return (
		<Button
			variant="outline"
			size="sm"
			className={className}
			onClick={handleClick}
			disabled={isStarting || call.status !== "idle"}
		>
			<HugeiconsIcon icon={icon} size={16} className="mr-2" />
			{label}
		</Button>
	)
}

type CallButtonGroupProps = {
	participantIds: string[]
	chatChannel?: string
	className?: string
}

export function CallButtonGroup({ participantIds, chatChannel, className }: CallButtonGroupProps) {
	return (
		<div className={className}>
			<CallButton
				participantIds={participantIds}
				chatChannel={chatChannel}
				type="voice"
				variant="icon"
			/>
			<CallButton
				participantIds={participantIds}
				chatChannel={chatChannel}
				type="video"
				variant="icon"
			/>
		</div>
	)
}
