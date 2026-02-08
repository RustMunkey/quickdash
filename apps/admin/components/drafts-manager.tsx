"use client"

import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, FileEditIcon, Clock01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
	getAllDrafts,
	getDraftsByKey,
	deleteDraft,
	formatDraftTime,
	type Draft,
} from "@/lib/use-draft"

// Draft indicator that shows when there are drafts available
export function DraftIndicator({
	draftKey,
	onSelect,
	className,
}: {
	draftKey: string
	onSelect: (draft: Draft) => void
	className?: string
}) {
	const [drafts, setDrafts] = useState<Draft[]>([])
	const [open, setOpen] = useState(false)

	useEffect(() => {
		setDrafts(getDraftsByKey(draftKey))
	}, [draftKey, open])

	if (drafts.length === 0) return null

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className={className}>
					<HugeiconsIcon icon={FileEditIcon} size={14} className="mr-1.5" />
					{drafts.length} draft{drafts.length !== 1 ? "s" : ""}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-72 p-0">
				<div className="px-3 py-2 border-b">
					<p className="text-sm font-medium">Saved Drafts</p>
					<p className="text-xs text-muted-foreground">Click to restore a draft</p>
				</div>
				<ScrollArea className="max-h-64">
					<div className="p-1">
						{drafts.map((draft) => (
							<div
								key={draft.id}
								className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group"
								onClick={() => {
									onSelect(draft)
									setOpen(false)
								}}
							>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">{draft.title || "Untitled"}</p>
									<p className="text-xs text-muted-foreground">
										{formatDraftTime(draft.updatedAt)}
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="size-7 opacity-0 group-hover:opacity-100 shrink-0"
									onClick={(e) => {
										e.stopPropagation()
										deleteDraft(draft.id)
										setDrafts(getDraftsByKey(draftKey))
									}}
								>
									<HugeiconsIcon icon={Delete02Icon} size={14} className="text-destructive" />
								</Button>
							</div>
						))}
					</div>
				</ScrollArea>
			</PopoverContent>
		</Popover>
	)
}

// Save status indicator
export function DraftStatus({
	lastSaved,
	isSaving,
}: {
	lastSaved: Date | null
	isSaving: boolean
}) {
	if (!lastSaved && !isSaving) return null

	return (
		<span className="text-xs text-muted-foreground flex items-center gap-1">
			<HugeiconsIcon icon={Clock01Icon} size={12} />
			{isSaving ? "Saving..." : `Draft saved ${formatDraftTime(lastSaved!)}`}
		</span>
	)
}

// Full drafts manager dialog for viewing all drafts
export function DraftsManagerDialog({
	trigger,
	onSelect,
	filterKey,
}: {
	trigger?: React.ReactNode
	onSelect?: (draft: Draft) => void
	filterKey?: string
}) {
	const [drafts, setDrafts] = useState<Draft[]>([])
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (open) {
			setDrafts(filterKey ? getDraftsByKey(filterKey) : getAllDrafts())
		}
	}, [open, filterKey])

	const handleDelete = (id: string) => {
		deleteDraft(id)
		setDrafts(filterKey ? getDraftsByKey(filterKey) : getAllDrafts())
	}

	const groupedDrafts = drafts.reduce(
		(acc, draft) => {
			if (!acc[draft.key]) acc[draft.key] = []
			acc[draft.key].push(draft)
			return acc
		},
		{} as Record<string, Draft[]>
	)

	const keyLabels: Record<string, string> = {
		note: "Developer Notes",
		"blog-post": "Blog Posts",
		product: "Products",
		"email-template": "Email Templates",
		"site-page": "Site Pages",
		"order-note": "Order Notes",
		category: "Categories",
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<HugeiconsIcon icon={FileEditIcon} size={14} className="mr-1.5" />
						View Drafts
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Saved Drafts</DialogTitle>
					<DialogDescription>
						Your unsaved work is automatically saved here.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="max-h-[60vh]">
					{drafts.length === 0 ? (
						<div className="py-8 text-center">
							<HugeiconsIcon
								icon={FileEditIcon}
								size={32}
								className="mx-auto text-muted-foreground mb-2"
							/>
							<p className="text-sm text-muted-foreground">No drafts saved</p>
						</div>
					) : filterKey ? (
						// Single key view
						<div className="space-y-1">
							{drafts.map((draft) => (
								<DraftItem
									key={draft.id}
									draft={draft}
									onSelect={() => {
										onSelect?.(draft)
										setOpen(false)
									}}
									onDelete={() => handleDelete(draft.id)}
								/>
							))}
						</div>
					) : (
						// Grouped view
						<div className="space-y-4">
							{Object.entries(groupedDrafts).map(([key, keyDrafts]) => (
								<div key={key}>
									<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
										{keyLabels[key] || key}
									</h4>
									<div className="space-y-1">
										{keyDrafts.map((draft) => (
											<DraftItem
												key={draft.id}
												draft={draft}
												onSelect={() => {
													onSelect?.(draft)
													setOpen(false)
												}}
												onDelete={() => handleDelete(draft.id)}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}

function DraftItem({
	draft,
	onSelect,
	onDelete,
}: {
	draft: Draft
	onSelect: () => void
	onDelete: () => void
}) {
	return (
		<div
			className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group"
			onClick={onSelect}
		>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{draft.title || "Untitled"}</p>
				<p className="text-xs text-muted-foreground">{formatDraftTime(draft.updatedAt)}</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="size-7 opacity-0 group-hover:opacity-100 shrink-0"
				onClick={(e) => {
					e.stopPropagation()
					onDelete()
				}}
			>
				<HugeiconsIcon icon={Delete02Icon} size={14} className="text-destructive" />
			</Button>
		</div>
	)
}
