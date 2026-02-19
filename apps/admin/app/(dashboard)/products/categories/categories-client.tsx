"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { slugify } from "@/lib/format"
import { createCategory, updateCategory, deleteCategory, bulkDeleteCategories } from "./actions"
import { useDraft, type Draft } from "@/lib/use-draft"
import { DraftIndicator, DraftStatus } from "@/components/drafts-manager"
import { MediaUploader, type MediaItem } from "@/components/media-uploader"

interface Category {
	id: string
	name: string
	slug: string
	description: string | null
	parentId: string | null
	sortOrder: number | null
	image: string | null
}

interface CategoriesClientProps {
	categories: Category[]
	totalCount: number
	currentPage: number
}

export function CategoriesClient({ categories, totalCount, currentPage }: CategoriesClientProps) {
	const router = useRouter()
	const [dialogOpen, setDialogOpen] = useState(false)
	const [deleteId, setDeleteId] = useState<string | null>(null)
	const [editing, setEditing] = useState<Category | null>(null)
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [parentFilter, setParentFilter] = useState("all")

	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [description, setDescription] = useState("")
	const [parentId, setParentId] = useState("")
	const [mediaItems, setMediaItems] = useState<MediaItem[]>([])

	// Draft support
	type CategoryFormData = {
		name: string
		slug: string
		description: string
		parentId: string
		mediaUrls: string[]
	}

	const {
		lastSaved: draftLastSaved,
		isSaving: draftIsSaving,
		debouncedSave: saveDraft,
		discardDraft,
		loadDraft,
		clearCurrentDraft,
	} = useDraft<CategoryFormData>({
		key: "category",
		getTitle: (data) => data.name || "Untitled Category",
		autoSave: true,
	})

	// Auto-save draft when form data changes (only when creating new)
	useEffect(() => {
		if (dialogOpen && !editing && name) {
			saveDraft({ name, slug, description, parentId, mediaUrls: mediaItems.map((i) => i.url) })
		}
	}, [dialogOpen, editing, name, slug, description, parentId, mediaItems, saveDraft])

	function handleLoadDraft(draft: Draft) {
		const data = draft.data as CategoryFormData
		setName(data.name || "")
		setSlug(data.slug || "")
		setDescription(data.description || "")
		setParentId(data.parentId || "")
		setMediaItems(
			(data.mediaUrls || []).map((url) => ({ id: crypto.randomUUID(), url, type: "image" as const }))
		)
		loadDraft(draft)
		setEditing(null)
		setDialogOpen(true)
	}

	const openCreate = () => {
		setEditing(null)
		setName("")
		setSlug("")
		setDescription("")
		setParentId("")
		setMediaItems([])
		clearCurrentDraft()
		setDialogOpen(true)
	}

	const openEdit = (cat: Category) => {
		setEditing(cat)
		setName(cat.name)
		setSlug(cat.slug)
		setDescription(cat.description ?? "")
		setParentId(cat.parentId ?? "")
		setMediaItems(cat.image ? [{ id: crypto.randomUUID(), url: cat.image, type: "image" as const }] : [])
		setDialogOpen(true)
	}

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Name is required")
			return
		}
		setLoading(true)
		try {
			const data = {
				name: name.trim(),
				slug: slug.trim() || slugify(name),
				description: description.trim(),
				parentId: parentId || undefined,
				image: mediaItems[0]?.url || undefined,
			}
			if (editing) {
				await updateCategory(editing.id, data)
				toast.success("Category updated")
			} else {
				await createCategory(data)
				toast.success("Category created")
				discardDraft()
			}
			setDialogOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!deleteId) return
		try {
			await deleteCategory(deleteId)
			toast.success("Category deleted")
			setDeleteId(null)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteCategories(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`${selectedIds.length} category(ies) deleted`)
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const parentMap = new Map(categories.map((c) => [c.id, c.name]))

	const filteredCategories = parentFilter === "all"
		? categories
		: parentFilter === "top-level"
			? categories.filter((c) => !c.parentId)
			: categories.filter((c) => c.parentId === parentFilter)

	const topLevelCategories = categories.filter((c) => !c.parentId)

	const columns: Column<Category>[] = [
		{
			key: "image",
			header: "",
			cell: (row) => row.image ? (
				<img src={row.image} alt={row.name} className="h-8 w-8 rounded object-cover border" />
			) : (
				<div className="h-8 w-8 rounded border bg-muted" />
			),
		},
		{
			key: "name",
			header: "Name",
			cell: (row) => (
				<button
					type="button"
					className="font-medium hover:underline text-left"
					onClick={(e) => {
						e.stopPropagation()
						openEdit(row)
					}}
				>
					{row.name}
				</button>
			),
		},
		{
			key: "slug",
			header: "Slug",
			cell: (row) => (
				<span className="text-muted-foreground text-xs font-mono">{row.slug}</span>
			),
		},
		{
			key: "parent",
			header: "Parent",
			cell: (row) => (
				<span className="text-muted-foreground">
					{row.parentId ? parentMap.get(row.parentId) ?? "—" : "—"}
				</span>
			),
		},
		{
			key: "description",
			header: "Description",
			cell: (row) => (
				<span className="text-muted-foreground text-xs truncate max-w-[200px] block">
					{row.description || "—"}
				</span>
			),
		},
	]

	return (
		<>
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Organize products into categories.
				</p>
				<div className="flex items-center gap-2 sm:hidden">
					<Button size="sm" onClick={openCreate}>Add Category</Button>
				</div>
			</div>

			<DataTable
				columns={columns}
				data={filteredCategories}
				searchPlaceholder="Search categories..."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				onRowClick={(row) => openEdit(row)}
				emptyMessage="No categories yet"
				emptyDescription="Create categories to organize your products."
				filters={
					<>
						<Select value={parentFilter} onValueChange={setParentFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[160px]">
								<SelectValue placeholder="All Categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								<SelectItem value="top-level">Top Level Only</SelectItem>
								{topLevelCategories.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="hidden sm:flex items-center gap-2">
							<DraftIndicator draftKey="category" onSelect={handleLoadDraft} />
							<Button size="sm" className="h-9" onClick={openCreate}>Add Category</Button>
						</div>
					</>
				}
				bulkActions={
					<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDelete}>
						Delete ({selectedIds.length})
					</Button>
				}
			/>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="cat-name">Name</Label>
							<Input
								id="cat-name"
								value={name}
								onChange={(e) => {
									setName(e.target.value)
									if (!editing) setSlug(slugify(e.target.value))
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cat-slug">Slug</Label>
							<Input id="cat-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="cat-desc">Description</Label>
							<Input id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Image</Label>
							<MediaUploader items={mediaItems} onChange={setMediaItems} maxItems={1} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="cat-parent">Parent Category</Label>
							<Select value={parentId || "none"} onValueChange={(val) => setParentId(val === "none" ? "" : val)}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="None (top level)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None (top level)</SelectItem>
									{categories
										.filter((c) => c.id !== editing?.id)
										.map((c) => (
											<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="flex-col sm:flex-row gap-2">
						{!editing && (
							<div className="flex-1 flex items-center">
								<DraftStatus lastSaved={draftLastSaved} isSaving={draftIsSaving} />
							</div>
						)}
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
							<Button onClick={handleSave} disabled={loading}>
								{loading ? "Saving..." : editing ? "Update" : "Create"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Category</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the category. Products in this category will become uncategorized.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
