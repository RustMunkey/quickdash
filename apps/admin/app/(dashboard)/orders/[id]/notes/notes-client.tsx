"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RichTextEditor, RichTextDisplay } from "@/components/rich-text-editor"
import { formatDateTime } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { addOrderNote, updateOrderNote, deleteOrderNote } from "../../actions"

interface Note {
	id: string
	content: string
	createdAt: Date
	updatedAt: Date
	authorName: string | null
	authorEmail: string | null
}

interface NotesClientProps {
	order: { id: string; orderNumber: string }
	notes: Note[]
}

export function NotesClient({ order, notes }: NotesClientProps) {
	useBreadcrumbOverride(order.id, `#${order.orderNumber}`)
	const router = useRouter()
	const [newNote, setNewNote] = useState("")
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editContent, setEditContent] = useState("")
	const [loading, setLoading] = useState(false)

	const handleAdd = async () => {
		const stripped = newNote.replace(/<[^>]*>/g, "").trim()
		if (!stripped) {
			toast.error("Note cannot be empty")
			return
		}
		setLoading(true)
		try {
			await addOrderNote(order.id, newNote)
			setNewNote("")
			router.refresh()
			toast.success("Note added")
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleUpdate = async () => {
		if (!editingId) return
		const stripped = editContent.replace(/<[^>]*>/g, "").trim()
		if (!stripped) {
			toast.error("Note cannot be empty")
			return
		}
		setLoading(true)
		try {
			await updateOrderNote(editingId, editContent)
			setEditingId(null)
			router.refresh()
			toast.success("Note updated")
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async (noteId: string) => {
		setLoading(true)
		try {
			await deleteOrderNote(noteId)
			router.refresh()
			toast.success("Note deleted")
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Notes</h2>
					<p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
				</div>
				<Button size="sm" onClick={handleAdd} disabled={loading}>
					{loading ? "Saving..." : "Save Note"}
				</Button>
			</div>

			{/* Add note */}
			<div className="rounded-lg border p-4">
				<RichTextEditor
					content={newNote}
					onChange={setNewNote}
					placeholder="Write a note..."
				/>
			</div>

			{/* Notes list */}
			{notes.length === 0 ? (
				<div className="rounded-lg border px-4 py-8 text-center">
					<p className="text-sm text-muted-foreground">No notes yet</p>
				</div>
			) : (
				<div className="space-y-3">
					{notes.map((note) => (
						<div key={note.id} className="rounded-lg border px-4 py-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">{note.authorName ?? note.authorEmail ?? "Unknown"}</span>
									<span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
									{note.updatedAt > note.createdAt && (
										<span className="text-xs text-muted-foreground italic">edited</span>
									)}
								</div>
								<div className="flex gap-1">
									<Button
										size="sm"
										variant="ghost"
										className="h-6 px-2 text-xs"
										onClick={() => {
											setEditingId(note.id)
											setEditContent(note.content)
										}}
									>
										Edit
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 px-2 text-xs text-destructive hover:text-destructive"
										onClick={() => handleDelete(note.id)}
										disabled={loading}
									>
										Delete
									</Button>
								</div>
							</div>
							<RichTextDisplay content={note.content} />
						</div>
					))}
				</div>
			)}

			{/* Edit dialog */}
			<Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null) }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Note</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<RichTextEditor
							content={editContent}
							onChange={setEditContent}
							placeholder="Edit note..."
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
						<Button onClick={handleUpdate} disabled={loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
