"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createCollection } from "../actions"
import { COLLECTION_TEMPLATES, type CollectionTemplate } from "../collection-templates"
import type { CollectionSchema } from "@quickdash/db/schema"

export default function NewCollectionPage() {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [mode, setMode] = useState<"choose" | "blank">("choose")
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")

	const handleCreateFromTemplate = async (template: CollectionTemplate) => {
		setLoading(true)
		try {
			await createCollection({
				name: template.name,
				slug: template.slug,
				description: template.description,
				icon: template.icon,
				schema: template.schema,
				allowPublicSubmit: template.allowPublicSubmit,
				publicSubmitStatus: template.publicSubmitStatus,
			})
			toast.success(`${template.name} collection created`)
			router.push(`/content/collections/${template.slug}`)
		} catch (e: any) {
			toast.error(e.message || "Failed to create collection")
		} finally {
			setLoading(false)
		}
	}

	const handleCreateBlank = async () => {
		if (!name.trim() || !slug.trim()) {
			toast.error("Name and slug are required")
			return
		}

		setLoading(true)
		try {
			const schema: CollectionSchema = {
				fields: [
					{ key: "title", label: "Title", type: "text", required: true },
				],
				settings: {
					titleField: "title",
					defaultSort: "sortOrder",
					defaultSortDir: "asc",
				},
			}

			await createCollection({
				name: name.trim(),
				slug: slug.trim(),
				schema,
			})
			toast.success("Collection created")
			router.push(`/content/collections/${slug.trim()}`)
		} catch (e: any) {
			toast.error(e.message || "Failed to create collection")
		} finally {
			setLoading(false)
		}
	}

	const handleNameChange = (value: string) => {
		setName(value)
		// Auto-generate slug from name
		setSlug(
			value
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
		)
	}

	if (mode === "blank") {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-lg">
				<div>
					<Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="mb-2">
						← Back
					</Button>
					<h2 className="text-lg font-semibold">Create Blank Collection</h2>
					<p className="text-sm text-muted-foreground">
						Start with an empty collection and add fields manually.
					</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input
							value={name}
							onChange={(e) => handleNameChange(e.target.value)}
							placeholder="e.g. Team Members"
						/>
					</div>
					<div className="space-y-2">
						<Label>Slug</Label>
						<Input
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="e.g. team-members"
						/>
						<p className="text-xs text-muted-foreground">
							API endpoint: /api/storefront/collections/{slug || "..."}
						</p>
					</div>
					<Button onClick={handleCreateBlank} disabled={loading} className="w-full">
						Create Collection
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">New Collection</h2>
					<p className="text-sm text-muted-foreground">
						Choose a template to get started quickly, or create a blank collection.
					</p>
				</div>
				<Button variant="outline" onClick={() => setMode("blank")}>
					Start Blank
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{COLLECTION_TEMPLATES.map((template) => (
					<Card
						key={template.slug}
						className="cursor-pointer transition-colors hover:border-foreground/20"
						onClick={() => !loading && handleCreateFromTemplate(template)}
					>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">{template.name}</CardTitle>
							<CardDescription>{template.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-xs text-muted-foreground">
								{template.schema.fields.length} fields: {template.schema.fields.map((f) => f.label).join(", ")}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
