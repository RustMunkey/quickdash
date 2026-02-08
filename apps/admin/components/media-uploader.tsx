"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { DragDropHorizontalIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	DndContext,
	closestCenter,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core"
import {
	SortableContext,
	useSortable,
	rectSortingStrategy,
	arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface MediaItem {
	id: string
	url: string
	type: "image" | "video"
}

interface MediaUploaderProps {
	items: MediaItem[]
	onChange: (items: MediaItem[]) => void
	maxItems?: number
}

function isVideo(url: string, mimeType?: string): boolean {
	if (mimeType) return mimeType.startsWith("video/")
	return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
}

function SortableItem({ item, onRemove, onSetThumbnail, isThumbnail }: {
	item: MediaItem
	onRemove: () => void
	onSetThumbnail: () => void
	isThumbnail: boolean
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`relative group rounded-lg border overflow-hidden aspect-square bg-muted ${isThumbnail ? "ring-2 ring-primary" : ""}`}
		>
			{/* Drag handle */}
			<button
				{...attributes}
				{...listeners}
				className="absolute top-1 left-1 z-20 p-1 rounded bg-black/50 text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
			>
				<HugeiconsIcon icon={DragDropHorizontalIcon} size={12} />
			</button>
			{item.type === "video" ? (
				<video src={item.url} className="w-full h-full object-cover" muted />
			) : (
				<img src={item.url} alt="" className="w-full h-full object-cover" />
			)}
			{item.type === "video" && (
				<Badge variant="secondary" className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0">
					Video
				</Badge>
			)}
			{isThumbnail && (
				<Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">
					Thumbnail
				</Badge>
			)}
			<div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
				{!isThumbnail && item.type === "image" && (
					<Button
						type="button"
						variant="secondary"
						size="icon"
						className="h-6 w-6 rounded-full"
						onClick={onSetThumbnail}
						title="Set as thumbnail"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm10.5 5.707L9.354 6.56a.5.5 0 0 0-.708 0l-2 2L5.354 7.27a.5.5 0 0 0-.708 0L3.5 8.414V12a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V9.707zM10 5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
					</Button>
				)}
				<Button
					type="button"
					variant="destructive"
					size="icon"
					className="h-6 w-6 rounded-full"
					onClick={onRemove}
					title="Remove"
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
				</Button>
			</div>
		</div>
	)
}

export function MediaUploader({ items, onChange, maxItems = 20 }: MediaUploaderProps) {
	const [uploading, setUploading] = useState(false)
	const [urlInput, setUrlInput] = useState("")
	const [showUrlInput, setShowUrlInput] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [dragOver, setDragOver] = useState(false)

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
	)

	const uploadFile = async (file: File): Promise<MediaItem | null> => {
		const formData = new FormData()
		formData.append("file", file)

		try {
			const res = await fetch("/api/upload", { method: "POST", body: formData })
			const data = await res.json()
			if (!res.ok) {
				toast.error(data.error || "Upload failed")
				return null
			}
			return {
				id: crypto.randomUUID(),
				url: data.url,
				type: data.type?.startsWith("video/") ? "video" : "image",
			}
		} catch {
			toast.error("Upload failed")
			return null
		}
	}

	const handleFiles = useCallback(async (files: FileList | File[]) => {
		const fileArray = Array.from(files)
		const remaining = maxItems - items.length
		if (fileArray.length > remaining) {
			toast.error(`Can only add ${remaining} more items`)
			return
		}

		setUploading(true)
		const results = await Promise.all(fileArray.map(uploadFile))
		const newItems = results.filter((r): r is MediaItem => r !== null)
		if (newItems.length > 0) {
			onChange([...items, ...newItems])
			toast.success(`${newItems.length} file(s) uploaded`)
		}
		setUploading(false)
	}, [items, maxItems, onChange])

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(false)
		if (e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files)
		}
	}, [handleFiles])

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(true)
	}, [])

	const handleDragLeave = useCallback(() => {
		setDragOver(false)
	}, [])

	const handleAddUrl = () => {
		const url = urlInput.trim()
		if (!url) return
		if (items.length >= maxItems) {
			toast.error(`Maximum ${maxItems} items`)
			return
		}
		const newItem: MediaItem = {
			id: crypto.randomUUID(),
			url,
			type: isVideo(url) ? "video" : "image",
		}
		onChange([...items, newItem])
		setUrlInput("")
	}

	const handleRemove = (id: string) => {
		onChange(items.filter((i) => i.id !== id))
	}

	const handleSetThumbnail = (id: string) => {
		const idx = items.findIndex((i) => i.id === id)
		if (idx <= 0) return
		const reordered = [...items]
		const [item] = reordered.splice(idx, 1)
		reordered.unshift(item)
		onChange(reordered)
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return
		const oldIndex = items.findIndex((i) => i.id === active.id)
		const newIndex = items.findIndex((i) => i.id === over.id)
		onChange(arrayMove(items, oldIndex, newIndex))
	}

	return (
		<div className="space-y-3">
			{/* Drop zone */}
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
					dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
				}`}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*,video/*"
					multiple
					className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
					onChange={(e) => {
						if (e.target.files) handleFiles(e.target.files)
						e.target.value = ""
					}}
				/>
				{uploading ? (
					<p className="text-sm text-muted-foreground">Uploading...</p>
				) : (
					<>
						<p className="text-sm font-medium">Drop files here or click to browse</p>
						<p className="text-xs text-muted-foreground mt-1">Images and videos up to 50MB</p>
					</>
				)}
			</div>

			{/* URL input toggle */}
			<div className="flex items-center gap-2">
				<Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(!showUrlInput)}>
					{showUrlInput ? "Hide URL input" : "Add via URL"}
				</Button>
			</div>
			{showUrlInput && (
				<div className="flex gap-2">
					<Input
						value={urlInput}
						onChange={(e) => setUrlInput(e.target.value)}
						placeholder="https://example.com/image.jpg"
						onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl() } }}
					/>
					<Button type="button" size="sm" variant="outline" onClick={handleAddUrl}>Add</Button>
				</div>
			)}

			{/* Sortable grid */}
			{items.length > 0 && (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
						<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
							{items.map((item, idx) => (
								<SortableItem
									key={item.id}
									item={item}
									isThumbnail={idx === 0}
									onRemove={() => handleRemove(item.id)}
									onSetThumbnail={() => handleSetThumbnail(item.id)}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			{items.length > 0 && (
				<p className="text-[11px] text-muted-foreground">
					{items.length}/{maxItems} items. Drag to reorder. First image is the thumbnail.
				</p>
			)}
		</div>
	)
}
