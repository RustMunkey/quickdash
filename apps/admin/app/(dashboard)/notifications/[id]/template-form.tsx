"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RichTextEditor } from "@/components/rich-text-editor"
import { createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from "../actions"
import { useDraft, type Draft } from "@/lib/use-draft"
import { DraftIndicator, DraftStatus } from "@/components/drafts-manager"

type EmailTemplate = {
	id: string
	name: string
	slug: string
	subject: string
	body: string | null
	variables: string[] | null
	isActive: boolean | null
}

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/(^_|_$)+/g, "")
}

export function TemplateForm({ template }: { template: EmailTemplate | null }) {
	const router = useRouter()
	const isNew = !template

	const [name, setName] = useState(template?.name || "")
	const [slug, setSlug] = useState(template?.slug || "")
	const [subject, setSubject] = useState(template?.subject || "")
	const [body, setBody] = useState(template?.body || "")
	const [isActive, setIsActive] = useState(template?.isActive ?? true)
	const [variablesInput, setVariablesInput] = useState(
		(template?.variables || []).join(", ")
	)
	const [saving, setSaving] = useState(false)

	// Draft support
	type TemplateFormData = {
		name: string
		slug: string
		subject: string
		body: string
		isActive: boolean
		variablesInput: string
	}

	const {
		lastSaved: draftLastSaved,
		isSaving: draftIsSaving,
		debouncedSave: saveDraft,
		discardDraft,
		loadDraft,
	} = useDraft<TemplateFormData>({
		key: "email-template",
		getTitle: (data) => data.name || "Untitled Template",
		autoSave: true,
	})

	const formData = useMemo(() => ({
		name,
		slug,
		subject,
		body,
		isActive,
		variablesInput,
	}), [name, slug, subject, body, isActive, variablesInput])

	// Auto-save draft when form data changes (only for new templates)
	useEffect(() => {
		if (isNew && (name || body)) {
			saveDraft(formData)
		}
	}, [isNew, name, body, formData, saveDraft])

	function handleLoadDraft(draft: Draft) {
		const data = draft.data as TemplateFormData
		setName(data.name || "")
		setSlug(data.slug || "")
		setSubject(data.subject || "")
		setBody(data.body || "")
		setIsActive(data.isActive ?? true)
		setVariablesInput(data.variablesInput || "")
		loadDraft(draft)
	}

	function handleNameChange(value: string) {
		setName(value)
		if (isNew || slug === slugify(template?.name || "")) {
			setSlug(slugify(value))
		}
	}

	async function handleSave() {
		if (!name.trim() || !slug.trim() || !subject.trim()) {
			toast.error("Name, slug, and subject are required")
			return
		}
		setSaving(true)
		try {
			const variables = variablesInput
				.split(",")
				.map((v) => v.trim())
				.filter(Boolean)
			const data = { name, slug, subject, body, variables, isActive }
			if (isNew) {
				await createEmailTemplate(data)
				toast.success("Template created")
				discardDraft()
			} else {
				await updateEmailTemplate(template.id, data)
				toast.success("Template updated")
			}
			router.push("/notifications")
			router.refresh()
		} catch {
			toast.error("Failed to save template")
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete() {
		if (!template) return
		if (!confirm("Delete this template?")) return
		await deleteEmailTemplate(template.id)
		toast.success("Template deleted")
		router.push("/notifications")
		router.refresh()
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-2xl font-bold tracking-tight">
						{isNew ? "New Template" : "Edit Template"}
					</h2>
					{isNew && (
						<DraftIndicator
							draftKey="email-template"
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
							<CardTitle>Template Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => handleNameChange(e.target.value)}
									placeholder="Order Confirmation"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="slug">Slug</Label>
								<Input
									id="slug"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									placeholder="order_confirmation"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="subject">Subject Line</Label>
								<Input
									id="subject"
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									placeholder="Your order {{order_number}} has been confirmed"
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Email Body</CardTitle>
						</CardHeader>
						<CardContent>
							<RichTextEditor
								content={body}
								onChange={setBody}
								placeholder="Design your email template..."
							/>
						</CardContent>
					</Card>

					{body && (
						<Card>
							<CardHeader>
								<CardTitle>Preview</CardTitle>
							</CardHeader>
							<CardContent>
								<div
									className="border rounded p-4 bg-white text-black prose prose-sm max-w-none"
									dangerouslySetInnerHTML={{ __html: body }}
								/>
							</CardContent>
						</Card>
					)}
				</div>

				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Status</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<Switch checked={isActive} onCheckedChange={setIsActive} />
								<span className="text-sm">{isActive ? "Active" : "Inactive"}</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Variables</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Input
								value={variablesInput}
								onChange={(e) => setVariablesInput(e.target.value)}
								placeholder="order_number, customer_name"
							/>
							<p className="text-xs text-muted-foreground">Comma-separated merge tags available in this template.</p>
							{variablesInput && (
								<div className="flex flex-wrap gap-1">
									{variablesInput.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
										<Badge key={v} variant="secondary" className="font-mono text-xs">
											{`{{${v}}}`}
										</Badge>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
