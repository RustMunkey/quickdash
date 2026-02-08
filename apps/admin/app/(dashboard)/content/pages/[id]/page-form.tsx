"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextEditor } from "@/components/rich-text-editor"
import { createSitePage, updateSitePage, deleteSitePage } from "../../actions"
import { useDraft, type Draft } from "@/lib/use-draft"
import { DraftIndicator, DraftStatus } from "@/components/drafts-manager"

type SitePage = {
	id: string
	title: string
	slug: string
	content: string | null
	status: string
	metaTitle: string | null
	metaDescription: string | null
}

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "")
}

export function PageForm({ page }: { page: SitePage | null }) {
	const router = useRouter()
	const isNew = !page

	const [title, setTitle] = useState(page?.title || "")
	const [slug, setSlug] = useState(page?.slug || "")
	const [content, setContent] = useState(page?.content || "")
	const [status, setStatus] = useState(page?.status || "draft")
	const [metaTitle, setMetaTitle] = useState(page?.metaTitle || "")
	const [metaDescription, setMetaDescription] = useState(page?.metaDescription || "")
	const [saving, setSaving] = useState(false)

	// Draft support
	type PageFormData = {
		title: string
		slug: string
		content: string
		status: string
		metaTitle: string
		metaDescription: string
	}

	const {
		lastSaved: draftLastSaved,
		isSaving: draftIsSaving,
		debouncedSave: saveDraft,
		discardDraft,
		loadDraft,
	} = useDraft<PageFormData>({
		key: "site-page",
		getTitle: (data) => data.title || "Untitled Page",
		autoSave: true,
	})

	const formData = useMemo(() => ({
		title,
		slug,
		content,
		status,
		metaTitle,
		metaDescription,
	}), [title, slug, content, status, metaTitle, metaDescription])

	// Auto-save draft when form data changes (only for new pages)
	useEffect(() => {
		if (isNew && (title || content)) {
			saveDraft(formData)
		}
	}, [isNew, title, content, formData, saveDraft])

	function handleLoadDraft(draft: Draft) {
		const data = draft.data as PageFormData
		setTitle(data.title || "")
		setSlug(data.slug || "")
		setContent(data.content || "")
		setStatus(data.status || "draft")
		setMetaTitle(data.metaTitle || "")
		setMetaDescription(data.metaDescription || "")
		loadDraft(draft)
	}

	function handleTitleChange(value: string) {
		setTitle(value)
		if (isNew || slug === slugify(page?.title || "")) {
			setSlug(slugify(value))
		}
	}

	async function handleSave() {
		if (!title.trim() || !slug.trim()) {
			toast.error("Title and slug are required")
			return
		}
		setSaving(true)
		try {
			const data = {
				title,
				slug,
				content: content || undefined,
				status,
				metaTitle: metaTitle || undefined,
				metaDescription: metaDescription || undefined,
			}
			if (isNew) {
				await createSitePage(data)
				toast.success("Page created")
				discardDraft()
			} else {
				await updateSitePage(page.id, data)
				toast.success("Page updated")
			}
			router.push("/content/pages")
			router.refresh()
		} catch {
			toast.error("Failed to save page")
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (!page) return
		if (!confirm("Delete this page?")) return
		await deleteSitePage(page.id)
		toast.success("Page deleted")
		router.push("/content/pages")
		router.refresh()
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-2xl font-bold tracking-tight">
						{isNew ? "New Page" : "Edit Page"}
					</h2>
					{isNew && (
						<DraftIndicator
							draftKey="site-page"
							onSelect={handleLoadDraft}
						/>
					)}
				</div>
				<div className="flex items-center gap-3">
					{isNew && <DraftStatus lastSaved={draftLastSaved} isSaving={draftIsSaving} />}
					{!isNew && (
						<Button variant="destructive" onClick={handleDelete}>Delete</Button>
					)}
					<Button onClick={handleSave} disabled={saving}>
						{saving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Content</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => handleTitleChange(e.target.value)}
									placeholder="Page title"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="slug">Slug</Label>
								<Input
									id="slug"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder="page-slug"
								/>
							</div>
							<div className="space-y-2">
								<Label>Body</Label>
								<RichTextEditor
									content={content}
									onChange={setContent}
									placeholder="Write page content..."
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Status</CardTitle>
						</CardHeader>
						<CardContent>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="published">Published</SelectItem>
								</SelectContent>
							</Select>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>SEO</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Meta Title</Label>
								<Input
									value={metaTitle}
									onChange={(e) => setMetaTitle(e.target.value)}
									placeholder="SEO title"
								/>
								<p className="text-xs text-muted-foreground">{metaTitle.length}/60</p>
							</div>
							<div className="space-y-2">
								<Label>Meta Description</Label>
								<Textarea
									value={metaDescription}
									onChange={(e) => setMetaDescription(e.target.value)}
									placeholder="SEO description"
									rows={3}
								/>
								<p className="text-xs text-muted-foreground">{metaDescription.length}/160</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
