"use client"

import { useCallOptional } from "./call-provider"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Call02Icon } from "@hugeicons/core-free-icons"

export function ActiveCallIndicator() {
	const call = useCallOptional()

	// Only show if we're in a call and minimized
	if (!call || (call.status !== "connecting" && call.status !== "connected")) {
		return null
	}

	// Don't show if call interface is already visible (not minimized)
	if (call.viewMode !== "minimized") {
		return null
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative size-8"
			onClick={() => call.setViewMode("floating")}
		>
			<HugeiconsIcon icon={Call02Icon} size={16} className="text-green-500" />
			<span className="absolute -top-0.5 -right-0.5 flex size-2">
				<span className="animate-ping absolute inline-flex size-full rounded-full bg-green-400 opacity-75" />
				<span className="relative inline-flex size-2 rounded-full bg-green-500" />
			</span>
			<span className="sr-only">Active call</span>
		</Button>
	)
}
