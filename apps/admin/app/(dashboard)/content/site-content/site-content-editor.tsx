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
import { updateSiteContent } from "../actions"

type ContentItem = {
	id: string
	key: string
	type: string
	value: string | null
	workspaceId: string | null
	updatedBy: string | null
	updatedAt: Date
}

export function SiteContentEditor({ items }: { items: ContentItem[] }) {
	const router = useRouter()
	const [saving, setSaving] = useState<string | null>(null)
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

	const handleSave = async (key: string) => {
		setSaving(key)
		try {
			await updateSiteContent(key, values[key] || "")
			toast.success("Saved")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to save")
		} finally {
			setSaving(null)
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

	const sortedGroups = Object.keys(grouped).sort()

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<Dialog open={newOpen} onOpenChange={setNewOpen}>
					<DialogTrigger asChild>
						<Button size="sm">New Content Entry</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>New Content Entry</DialogTitle>
						</DialogHeader>
						<form action={handleAddNew} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="key">Key</Label>
								<Input id="key" name="key" placeholder="section:field" required />
								<p className="text-xs text-muted-foreground">Use format &quot;section:field&quot; to group entries</p>
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
							const isDirty = values[item.key] !== (item.value || "")
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
									<Button
										size="sm"
										variant={isDirty ? "default" : "outline"}
										disabled={!isDirty || saving === item.key}
										onClick={() => handleSave(item.key)}
									>
										{saving === item.key ? "..." : "Save"}
									</Button>
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
