"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MediaUploader, type MediaItem } from "@/components/media-uploader"
import { bulkUpdateSiteContent, updateSiteContent } from "../actions"

type ContentItem = {
	id: string
	key: string
	type: string
	value: string | null
	workspaceId: string | null
	updatedBy: string | null
	updatedAt: Date
}

function isImageKey(key: string): boolean {
	const lower = key.toLowerCase()
	return (
		lower.endsWith(":image") ||
		lower.endsWith(":images") ||
		lower.endsWith(":logo") ||
		lower.endsWith(":banner") ||
		lower.endsWith(":icon") ||
		lower.endsWith(":thumbnail") ||
		lower.endsWith(":cover") ||
		lower.endsWith(":avatar") ||
		lower.endsWith(":photo") ||
		lower.endsWith(":background")
	)
}

function isMultiImageKey(key: string): boolean {
	return key.toLowerCase().endsWith(":images")
}

function isImageValue(value: string | null): boolean {
	if (!value) return false
	return value.startsWith("data:image") || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(value)
}

function parseImageValue(value: string | null, isMulti: boolean): MediaItem[] {
	if (!value) return []
	if (isMulti) {
		try {
			const parsed = JSON.parse(value)
			if (Array.isArray(parsed)) {
				return parsed.map((url: string, i: number) => ({
					id: `existing-${i}`,
					url,
					type: "image" as const,
				}))
			}
		} catch {}
	}
	if (value && (value.startsWith("http") || value.startsWith("data:"))) {
		return [{ id: "existing-0", url: value, type: "image" as const }]
	}
	return []
}

export function SiteContentEditor({ items }: { items: ContentItem[] }) {
	const router = useRouter()
	const [saving, setSaving] = useState(false)
	const [values, setValues] = useState<Record<string, string>>(() => {
		const map: Record<string, string> = {}
		for (const item of items) {
			map[item.key] = item.value || ""
		}
		return map
	})
	const [newOpen, setNewOpen] = useState(false)

	// Group items by prefix (before colon)
	const grouped: Record<string, ContentItem[]> = {}
	for (const item of items) {
		const colonIdx = item.key.indexOf(":")
		const prefix = colonIdx > 0 ? item.key.slice(0, colonIdx) : "other"
		if (!grouped[prefix]) grouped[prefix] = []
		grouped[prefix].push(item)
	}

	const getDirtyEntries = () => {
		return items
			.filter(item => values[item.key] !== (item.value || ""))
			.map(item => ({ key: item.key, value: values[item.key] || "" }))
	}

	const hasDirty = getDirtyEntries().length > 0

	const handleSaveAll = async () => {
		const dirty = getDirtyEntries()
		if (dirty.length === 0) return
		setSaving(true)
		try {
			await bulkUpdateSiteContent(dirty)
			toast.success("Saved")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to save")
		} finally {
			setSaving(false)
		}
	}

	const handleAddNew = async (formData: FormData) => {
		const key = formData.get("key") as string
		const value = formData.get("value") as string
		if (!key) return

		try {
			await updateSiteContent(key, value)
			toast.success("Content added")
			setNewOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to add")
		}
	}

	const handleImageChange = (key: string, mediaItems: MediaItem[], isMulti: boolean) => {
		if (isMulti) {
			const urls = mediaItems.map(m => m.url)
			setValues(v => ({ ...v, [key]: JSON.stringify(urls) }))
		} else {
			setValues(v => ({ ...v, [key]: mediaItems[0]?.url || "" }))
		}
	}

	const sortedGroups = Object.keys(grouped).sort()

	return (
		<div className="space-y-6">
			<div className="flex justify-end gap-2">
				<Button
					size="sm"
					disabled={!hasDirty || saving}
					onClick={handleSaveAll}
				>
					{saving ? "Saving..." : "Save Changes"}
				</Button>
				<Dialog open={newOpen} onOpenChange={setNewOpen}>
					<DialogTrigger asChild>
						<Button size="sm" variant="outline">New Content Entry</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>New Content Entry</DialogTitle>
						</DialogHeader>
						<form action={handleAddNew} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="key">Key</Label>
								<Input id="key" name="key" placeholder="section:field" required />
								<p className="text-xs text-muted-foreground">Use format &quot;section:field&quot; to group entries. Suffix with :image or :images for image fields.</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="value">Value</Label>
								<Textarea id="value" name="value" rows={3} />
							</div>
							<Button type="submit" className="w-full">Add</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{sortedGroups.map((group) => (
				<Card key={group}>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{group}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{grouped[group].sort((a, b) => a.key.localeCompare(b.key)).map((item) => {
							const colonIdx = item.key.indexOf(":")
							const displayKey = colonIdx > 0 ? item.key.slice(colonIdx + 1) : item.key
							const isImg = isImageKey(item.key) || item.type === "image" || isImageValue(item.value)
							const isMulti = isMultiImageKey(item.key)

							if (isImg) {
								const mediaItems = parseImageValue(values[item.key], isMulti)
								return (
									<div key={item.id} className="space-y-2">
										<Label className="text-sm font-medium">{displayKey}</Label>
										<MediaUploader
											items={mediaItems}
											onChange={(items) => handleImageChange(item.key, items, isMulti)}
											maxItems={isMulti ? 20 : 1}
										/>
									</div>
								)
							}

							return (
								<div key={item.id} className="flex items-start gap-3">
									<Label className="w-40 pt-2 text-sm font-medium shrink-0">{displayKey}</Label>
									{(item.value?.length || 0) > 80 ? (
										<Textarea
											value={values[item.key] || ""}
											onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
											rows={3}
											className="flex-1"
										/>
									) : (
										<Input
											value={values[item.key] || ""}
											onChange={(e) => setValues((v) => ({ ...v, [item.key]: e.target.value }))}
											className="flex-1"
										/>
									)}
								</div>
							)
						})}
					</CardContent>
				</Card>
			))}

			{sortedGroups.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					No site content entries yet. Click &quot;New Content Entry&quot; to add one.
				</div>
			)}
		</div>
	)
}
