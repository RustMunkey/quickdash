"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { createMediaItem, updateMediaItem, deleteMediaItem } from "../actions"

type MediaItemType = {
	id: string
	url: string
	filename: string
	mimeType: string | null
	size: number | null
	alt: string | null
	folder: string | null
	createdAt: Date
}

export function MediaLibrary({ items: initialItems }: { items: MediaItemType[] }) {
	const [items, setItems] = useState(initialItems)
	const [typeFilter, setTypeFilter] = useState("all")
	const [search, setSearch] = useState("")
	const [selectedItem, setSelectedItem] = useState<MediaItemType | null>(null)
	const [editAlt, setEditAlt] = useState("")
	const [uploading, setUploading] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const filtered = items.filter((item) => {
		if (typeFilter === "image" && !item.mimeType?.startsWith("image/")) return false
		if (typeFilter === "video" && !item.mimeType?.startsWith("video/")) return false
		if (search && !item.filename.toLowerCase().includes(search.toLowerCase())) return false
		return true
	})

	async function handleUpload(files: FileList) {
		setUploading(true)
		try {
			for (const file of Array.from(files)) {
				const formData = new FormData()
				formData.append("file", file)

				const res = await fetch("/api/upload", { method: "POST", body: formData })
				if (!res.ok) throw new Error("Upload failed")

				const { url } = await res.json()
				const item = await createMediaItem({
					url,
					filename: file.name,
					mimeType: file.type,
					size: file.size,
				})
				setItems((prev) => [item, ...prev])
			}
			toast.success("Upload complete")
		} catch {
			toast.error("Upload failed")
		} finally {
			setUploading(false)
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault()
		if (e.dataTransfer.files.length > 0) {
			handleUpload(e.dataTransfer.files)
		}
	}

	function openDetail(item: MediaItemType) {
		setSelectedItem(item)
		setEditAlt(item.alt || "")
	}

	async function handleSaveAlt() {
		if (!selectedItem) return
		await updateMediaItem(selectedItem.id, { alt: editAlt })
		setItems((prev) =>
			prev.map((i) => (i.id === selectedItem.id ? { ...i, alt: editAlt } : i))
		)
		toast.success("Alt text updated")
		setSelectedItem(null)
	}

	async function handleDeleteItem() {
		if (!selectedItem) return
		if (!confirm("Delete this file?")) return
		await deleteMediaItem(selectedItem.id)
		setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
		toast.success("File deleted")
		setSelectedItem(null)
	}

	function formatSize(bytes: number | null) {
		if (!bytes) return "—"
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1048576).toFixed(1)} MB`
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">Upload and manage images and videos.</p>
				<div className="flex items-center gap-2">
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="image">Images</SelectItem>
							<SelectItem value="video">Videos</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder="Search files..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-[200px]"
					/>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt,.json,.svg,.woff,.woff2,.ttf,.otf"
						className="hidden"
						onChange={(e) => e.target.files && handleUpload(e.target.files)}
					/>
					<Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
						{uploading ? "Uploading..." : "Upload"}
					</Button>
				</div>
			</div>

			<div
				className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
				onDrop={handleDrop}
				onDragOver={(e) => e.preventDefault()}
				onClick={() => fileInputRef.current?.click()}
			>
				Drop files here or click to upload
			</div>

			{filtered.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					No media files found.
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
					{filtered.map((item) => (
						<Card
							key={item.id}
							className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
							onClick={() => openDetail(item)}
						>
							<div className="aspect-square relative bg-muted">
								{item.mimeType?.startsWith("video/") ? (
									<div className="flex items-center justify-center h-full text-xs text-muted-foreground">
										<div className="text-center">
											<div className="text-2xl mb-1">▶</div>
											<div>Video</div>
										</div>
									</div>
								) : (
									<img
										src={item.url}
										alt={item.alt || item.filename}
										className="w-full h-full object-cover"
									/>
								)}
							</div>
							<div className="p-2">
								<p className="text-xs truncate">{item.filename}</p>
								<p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
							</div>
						</Card>
					))}
				</div>
			)}

			<Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{selectedItem?.filename}</DialogTitle>
					</DialogHeader>
					{selectedItem && (
						<div className="space-y-4">
							{selectedItem.mimeType?.startsWith("image/") && (
								<img
									src={selectedItem.url}
									alt={selectedItem.alt || ""}
									className="w-full max-h-64 object-contain rounded bg-muted"
								/>
							)}
							<div className="space-y-2">
								<Label>URL</Label>
								<Input value={selectedItem.url} readOnly onClick={(e) => {
									(e.target as HTMLInputElement).select()
									navigator.clipboard.writeText(selectedItem.url)
									toast.success("URL copied")
								}} />
							</div>
							<div className="space-y-2">
								<Label>Alt Text</Label>
								<Input
									value={editAlt}
									onChange={(e) => setEditAlt(e.target.value)}
									placeholder="Describe this image..."
								/>
							</div>
							<div className="text-xs text-muted-foreground space-y-1">
								<p>Type: {selectedItem.mimeType || "Unknown"}</p>
								<p>Size: {formatSize(selectedItem.size)}</p>
								<p>Uploaded: {new Date(selectedItem.createdAt).toLocaleString()}</p>
							</div>
							<div className="flex gap-2 justify-end">
								<Button variant="destructive" onClick={handleDeleteItem}>Delete</Button>
								<Button onClick={handleSaveAlt}>Save</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
