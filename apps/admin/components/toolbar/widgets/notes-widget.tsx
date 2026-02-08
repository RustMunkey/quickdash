"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const STORAGE_KEY = "quickdash_scratchpad"

export function NotesWidget() {
	const [content, setContent] = React.useState("")
	const [lastSaved, setLastSaved] = React.useState<Date | null>(null)

	// Load from localStorage on mount
	React.useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY)
		if (saved) {
			try {
				const parsed = JSON.parse(saved)
				setContent(parsed.content || "")
				if (parsed.savedAt) {
					setLastSaved(new Date(parsed.savedAt))
				}
			} catch {
				setContent(saved) // Legacy plain text
			}
		}
	}, [])

	// Auto-save on change
	React.useEffect(() => {
		const timeout = setTimeout(() => {
			if (content) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					content,
					savedAt: new Date().toISOString(),
				}))
				setLastSaved(new Date())
			}
		}, 500)

		return () => clearTimeout(timeout)
	}, [content])

	const clear = () => {
		setContent("")
		localStorage.removeItem(STORAGE_KEY)
		setLastSaved(null)
	}

	const copy = () => {
		navigator.clipboard.writeText(content)
		toast.success("Copied to clipboard")
	}

	const charCount = content.length
	const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

	return (
		<div className="p-4 space-y-3 h-full flex flex-col">
			<div className="flex items-center justify-between">
				<div className="text-xs text-muted-foreground">
					{wordCount} words · {charCount} chars
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						onClick={copy}
						disabled={!content}
					>
						<HugeiconsIcon icon={Copy01Icon} size={14} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7"
						onClick={clear}
						disabled={!content}
					>
						<HugeiconsIcon icon={Delete02Icon} size={14} />
					</Button>
				</div>
			</div>

			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				placeholder="Quick notes, ideas, reminders..."
				className="flex-1 min-h-[200px] resize-none text-sm"
			/>

			{lastSaved && (
				<div className="text-[10px] text-muted-foreground text-right">
					Auto-saved {lastSaved.toLocaleTimeString()}
				</div>
			)}
		</div>
	)
}
