"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { MediaUploader, type MediaItem } from "@/components/media-uploader"
import { updateCategory } from "../actions"

interface Category {
	id: string
	name: string
	slug: string
	description: string | null
	parentId: string | null
	sortOrder: number | null
	image: string | null
}

interface Props {
	category: Category
	categories: Category[]
}

export function CategoryEditForm({ category, categories }: Props) {
	const router = useRouter()
	useBreadcrumbOverride(category.id, category.name)
	const [loading, setLoading] = useState(false)
	const [name, setName] = useState(category.name)
	const [slug, setSlug] = useState(category.slug)
	const [description, setDescription] = useState(category.description ?? "")
	const [parentId, setParentId] = useState(category.parentId ?? "")
	const [mediaItems, setMediaItems] = useState<MediaItem[]>(
		category.image ? [{ id: crypto.randomUUID(), url: category.image, type: "image" }] : []
	)

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Name is required")
			return
		}
		setLoading(true)
		try {
			await updateCategory(category.id, {
				name: name.trim(),
				slug: slug.trim(),
				description: description.trim(),
				parentId: parentId || undefined,
				image: mediaItems[0]?.url || undefined,
			})
			toast.success("Category updated")
			router.push("/products/categories")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-lg space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Name</Label>
				<Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label htmlFor="slug">Slug</Label>
				<Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
			</div>
			<div className="space-y-2">
				<Label>Image</Label>
				<MediaUploader items={mediaItems} onChange={setMediaItems} maxItems={1} />
			</div>
			<div className="space-y-2">
				<Label htmlFor="parent">Parent Category</Label>
				<Select value={parentId || "none"} onValueChange={(val) => setParentId(val === "none" ? "" : val)}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="None (top level)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None (top level)</SelectItem>
						{categories
							.filter((c) => c.id !== category.id)
							.map((c) => (
								<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
							))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex gap-3 pt-4">
				<Button onClick={handleSave} disabled={loading}>
					{loading ? "Saving..." : "Save Changes"}
				</Button>
				<Button variant="outline" onClick={() => router.push("/products/categories")}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
