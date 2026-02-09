"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MediaUploader, type MediaItem } from "@/components/media-uploader"
import type { CollectionField } from "@quickdash/db/schema"

interface FieldRendererProps {
	field: CollectionField
	value: unknown
	onChange: (value: unknown) => void
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
	const id = `field-${field.key}`

	switch (field.type) {
		case "text":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						required={field.required}
					/>
				</div>
			)

		case "textarea":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Textarea
						id={id}
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						rows={3}
						required={field.required}
					/>
				</div>
			)

		case "number":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="number"
						value={value !== undefined && value !== null ? String(value) : ""}
						onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
						placeholder={field.placeholder}
						required={field.required}
					/>
				</div>
			)

		case "boolean":
			return (
				<div className="flex items-center gap-3">
					<Switch
						id={id}
						checked={!!value}
						onCheckedChange={(checked) => onChange(checked)}
					/>
					<Label htmlFor={id}>{field.label}</Label>
				</div>
			)

		case "select":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Select
						value={(value as string) ?? ""}
						onValueChange={(v) => onChange(v)}
					>
						<SelectTrigger id={id}>
							<SelectValue placeholder={field.placeholder || "Select..."} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)

		case "image": {
			const currentUrl = (value as string) ?? ""
			const mediaItems: MediaItem[] = currentUrl
				? [{ id: "existing-0", url: currentUrl, type: "image" }]
				: []

			return (
				<div className="space-y-2">
					<Label>{field.label}{field.required && " *"}</Label>
					<MediaUploader
						items={mediaItems}
						onChange={(items) => onChange(items[0]?.url || "")}
						maxItems={1}
					/>
				</div>
			)
		}

		case "url":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="url"
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder || "https://..."}
						required={field.required}
					/>
				</div>
			)

		case "email":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="email"
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						required={field.required}
					/>
				</div>
			)

		case "date":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="date"
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
						required={field.required}
					/>
				</div>
			)

		case "rating":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="number"
						min={1}
						max={5}
						value={value !== undefined && value !== null ? String(value) : ""}
						onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
						required={field.required}
					/>
				</div>
			)

		case "color":
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}{field.required && " *"}</Label>
					<Input
						id={id}
						type="color"
						value={(value as string) ?? "#000000"}
						onChange={(e) => onChange(e.target.value)}
						className="h-10 w-20 p-1"
					/>
				</div>
			)

		default:
			return (
				<div className="space-y-2">
					<Label htmlFor={id}>{field.label}</Label>
					<Input
						id={id}
						value={(value as string) ?? ""}
						onChange={(e) => onChange(e.target.value)}
					/>
				</div>
			)
	}
}
