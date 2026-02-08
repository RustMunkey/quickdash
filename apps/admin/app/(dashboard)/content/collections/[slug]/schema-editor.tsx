"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { updateCollection } from "../actions"
import type { CollectionSchema, CollectionField, FieldType } from "@quickdash/db/schema"

const FIELD_TYPES: { value: FieldType; label: string }[] = [
	{ value: "text", label: "Text" },
	{ value: "textarea", label: "Text Area" },
	{ value: "number", label: "Number" },
	{ value: "boolean", label: "Boolean" },
	{ value: "select", label: "Select" },
	{ value: "image", label: "Image URL" },
	{ value: "url", label: "URL" },
	{ value: "email", label: "Email" },
	{ value: "date", label: "Date" },
	{ value: "rating", label: "Rating (1-5)" },
	{ value: "color", label: "Color" },
]

type CollectionData = {
	id: string
	name: string
	slug: string
	description: string | null
	icon: string | null
	schema: CollectionSchema
	allowPublicSubmit: boolean | null
	publicSubmitStatus: string | null
}

interface SchemaEditorProps {
	collection: CollectionData
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SchemaEditor({ collection, open, onOpenChange }: SchemaEditorProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [name, setName] = useState(collection.name)
	const [slug, setSlug] = useState(collection.slug)
	const [description, setDescription] = useState(collection.description || "")
	const [icon, setIcon] = useState(collection.icon || "")
	const [allowPublicSubmit, setAllowPublicSubmit] = useState(collection.allowPublicSubmit ?? false)
	const [publicSubmitStatus, setPublicSubmitStatus] = useState(collection.publicSubmitStatus || "inactive")
	const [fields, setFields] = useState<CollectionField[]>(
		(collection.schema as CollectionSchema).fields
	)
	const [titleField, setTitleField] = useState(
		(collection.schema as CollectionSchema).settings.titleField
	)

	const addField = () => {
		setFields([
			...fields,
			{ key: "", label: "", type: "text" },
		])
	}

	const removeField = (index: number) => {
		setFields(fields.filter((_, i) => i !== index))
	}

	const updateField = (index: number, updates: Partial<CollectionField>) => {
		setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)))
	}

	const moveField = (index: number, direction: "up" | "down") => {
		const newIndex = direction === "up" ? index - 1 : index + 1
		if (newIndex < 0 || newIndex >= fields.length) return
		const newFields = [...fields]
		;[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
		setFields(newFields)
	}

	const handleSave = async () => {
		// Validate
		if (!name.trim()) {
			toast.error("Collection name is required")
			return
		}
		if (!slug.trim()) {
			toast.error("Slug is required")
			return
		}
		if (fields.length === 0) {
			toast.error("At least one field is required")
			return
		}
		for (const f of fields) {
			if (!f.key.trim() || !f.label.trim()) {
				toast.error("All fields must have a key and label")
				return
			}
		}
		if (!titleField || !fields.some((f) => f.key === titleField)) {
			toast.error("Title field must reference a valid field key")
			return
		}

		setLoading(true)
		try {
			const schema: CollectionSchema = {
				fields,
				settings: {
					titleField,
					descriptionField: (collection.schema as CollectionSchema).settings.descriptionField,
					imageField: (collection.schema as CollectionSchema).settings.imageField,
					defaultSort: (collection.schema as CollectionSchema).settings.defaultSort,
					defaultSortDir: (collection.schema as CollectionSchema).settings.defaultSortDir,
				},
			}

			await updateCollection(collection.id, {
				name,
				slug,
				description: description || undefined,
				icon: icon || undefined,
				schema,
				allowPublicSubmit,
				publicSubmitStatus,
			})

			toast.success("Collection updated")
			onOpenChange(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to save")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Collection Settings</DialogTitle>
				</DialogHeader>
				<div className="space-y-6">
					{/* Basic info */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Slug</Label>
							<Input value={slug} onChange={(e) => setSlug(e.target.value)} />
						</div>
					</div>

					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Icon</Label>
							<Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. star, users" />
						</div>
						<div className="space-y-2">
							<Label>Title Field</Label>
							<Select value={titleField} onValueChange={setTitleField}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{fields.filter((f) => f.key).map((f) => (
										<SelectItem key={f.key} value={f.key}>{f.label || f.key}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Public submissions */}
					<div className="space-y-3 border rounded-lg p-4">
						<div className="flex items-center gap-3">
							<Switch checked={allowPublicSubmit} onCheckedChange={setAllowPublicSubmit} />
							<Label>Allow public submissions via storefront API</Label>
						</div>
						{allowPublicSubmit && (
							<div className="space-y-2">
								<Label>Default status for submissions</Label>
								<Select value={publicSubmitStatus} onValueChange={setPublicSubmitStatus}>
									<SelectTrigger className="w-[200px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="inactive">Inactive (needs approval)</SelectItem>
										<SelectItem value="active">Active (auto-publish)</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					{/* Fields */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-base font-medium">Fields</Label>
							<Button size="sm" variant="outline" onClick={addField}>Add Field</Button>
						</div>

						{fields.map((field, i) => (
							<div key={i} className="flex items-start gap-2 border rounded-lg p-3">
								<div className="flex flex-col gap-1 mt-1">
									<Button
										size="sm"
										variant="ghost"
										className="h-6 w-6 p-0"
										disabled={i === 0}
										onClick={() => moveField(i, "up")}
									>
										↑
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="h-6 w-6 p-0"
										disabled={i === fields.length - 1}
										onClick={() => moveField(i, "down")}
									>
										↓
									</Button>
								</div>

								<div className="flex-1 grid grid-cols-3 gap-2">
									<Input
										placeholder="Key"
										value={field.key}
										onChange={(e) => updateField(i, { key: e.target.value.replace(/\s/g, "") })}
									/>
									<Input
										placeholder="Label"
										value={field.label}
										onChange={(e) => updateField(i, { label: e.target.value })}
									/>
									<Select
										value={field.type}
										onValueChange={(v) => updateField(i, { type: v as FieldType })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FIELD_TYPES.map((t) => (
												<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-center gap-2 mt-2">
									<Checkbox
										checked={field.required ?? false}
										onCheckedChange={(checked) => updateField(i, { required: !!checked })}
									/>
									<span className="text-xs text-muted-foreground">Req</span>
								</div>

								<Button
									size="sm"
									variant="ghost"
									className="text-destructive mt-1"
									onClick={() => removeField(i)}
								>
									×
								</Button>
							</div>
						))}
					</div>

					<Button onClick={handleSave} disabled={loading} className="w-full">
						Save Changes
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
