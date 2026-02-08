"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/data-table"
import { createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from "../actions"

type EmailTemplate = {
	id: string
	name: string
	slug: string
	subject: string
	body: string | null
	variables: string[] | null
	isActive: boolean | null
}

type SentMessage = {
	id: string
	recipientEmail: string
	subject: string
	status: string
	sentAt: Date
}

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/(^_|_$)+/g, "")
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { font-size: 24px; margin: 0 0 16px; color: #18181b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .btn {
      display: inline-block;
      padding: 10px 24px;
      background: #18181b;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
    }
    .footer {
      text-align: center;
      padding: 24px 0;
      font-size: 12px;
      color: #a1a1aa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Hello {{customer_name}}</h1>
      <p>Your email content goes here. Use merge tags like <code>{{variable_name}}</code> for dynamic content.</p>
      <a href="{{action_url}}" class="btn">View Details</a>
    </div>
    <div class="footer">
      <p>&copy; {{year}} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

const sentColumns: Column<SentMessage>[] = [
	{
		key: "recipientEmail",
		header: "Recipient",
		cell: (row) => <span className="font-medium">{row.recipientEmail}</span>,
	},
	{
		key: "subject",
		header: "Subject",
		cell: (row) => <span className="truncate max-w-[250px] block">{row.subject}</span>,
	},
	{
		key: "status",
		header: "Status",
		cell: (row) => (
			<Badge variant={row.status === "sent" ? "default" : "secondary"} className="text-xs">
				{row.status}
			</Badge>
		),
	},
	{
		key: "sentAt",
		header: "Sent",
		cell: (row) => new Date(row.sentAt).toLocaleString(),
	},
]

interface TemplateEditorProps {
	template: EmailTemplate | null
	sentMessages: SentMessage[]
	sentTotalCount: number
}

export function TemplateEditor({ template, sentMessages, sentTotalCount }: TemplateEditorProps) {
	const router = useRouter()
	const isNew = !template
	const iframeRef = useRef<HTMLIFrameElement>(null)

	const [tab, setTab] = useState<"code" | "preview" | "sent">("code")
	const [name, setName] = useState(template?.name || "")
	const [slug, setSlug] = useState(template?.slug || "")
	const [subject, setSubject] = useState(template?.subject || "")
	const [body, setBody] = useState(template?.body || (isNew ? DEFAULT_HTML : ""))
	const [isActive, setIsActive] = useState(template?.isActive ?? true)
	const [variablesInput, setVariablesInput] = useState(
		(template?.variables || []).join(", ")
	)
	const [saving, setSaving] = useState(false)

	function handleNameChange(value: string) {
		setName(value)
		if (isNew || slug === slugify(template?.name || "")) {
			setSlug(slugify(value))
		}
	}

	// Update iframe preview when body changes or tab switches to preview
	const updatePreview = useCallback(() => {
		if (iframeRef.current) {
			const doc = iframeRef.current.contentDocument
			if (doc) {
				doc.open()
				doc.write(body)
				doc.close()
			}
		}
	}, [body])

	useEffect(() => {
		if (tab === "preview") {
			// Small delay to ensure iframe is mounted
			const timer = setTimeout(updatePreview, 50)
			return () => clearTimeout(timer)
		}
	}, [tab, updatePreview])

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
			} else {
				await updateEmailTemplate(template.id, data)
				toast.success("Template updated")
			}
			router.push("/marketing/email-templates")
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
		router.push("/marketing/email-templates")
		router.refresh()
	}

	return (
		<div className="space-y-4">
			{/* Header: metadata fields + actions */}
			<div className="flex items-start gap-4">
				<div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
					<div className="space-y-1">
						<Label htmlFor="name" className="text-xs">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => handleNameChange(e.target.value)}
							placeholder="Order Confirmation"
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="slug" className="text-xs">Slug</Label>
						<Input
							id="slug"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="order_confirmation"
							className="h-8 text-sm font-mono"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="subject" className="text-xs">Subject Line</Label>
						<Input
							id="subject"
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder="Your order {{order_number}} has been confirmed"
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="variables" className="text-xs">Variables</Label>
						<Input
							id="variables"
							value={variablesInput}
							onChange={(e) => setVariablesInput(e.target.value)}
							placeholder="order_number, customer_name"
							className="h-8 text-sm font-mono"
						/>
					</div>
				</div>
			</div>

			{/* Variables preview + status + actions row */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 flex-wrap">
					{variablesInput && variablesInput.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
						<Badge key={v} variant="secondary" className="font-mono text-[10px]">
							{`{{${v}}}`}
						</Badge>
					))}
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Switch checked={isActive} onCheckedChange={setIsActive} />
						<span className="text-xs text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
					</div>
					{!isNew && (
						<Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleDelete}>
							Delete
						</Button>
					)}
					<Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving}>
						{saving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			{/* Tab toggle right-aligned */}
			<div className="flex justify-end">
				<div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30">
					<Button
						size="sm"
						variant={tab === "code" ? "default" : "ghost"}
						className="h-7 text-xs px-3"
						onClick={() => setTab("code")}
					>
						Code
					</Button>
					<Button
						size="sm"
						variant={tab === "preview" ? "default" : "ghost"}
						className="h-7 text-xs px-3"
						onClick={() => setTab("preview")}
					>
						Preview
					</Button>
					{!isNew && (
						<Button
							size="sm"
							variant={tab === "sent" ? "default" : "ghost"}
							className="h-7 text-xs px-3"
							onClick={() => setTab("sent")}
						>
							Sent Log
							{sentTotalCount > 0 && (
								<Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
									{sentTotalCount}
								</Badge>
							)}
						</Button>
					)}
				</div>
			</div>

			{/* Code Editor */}
			{tab === "code" && (
				<div className="rounded-lg border overflow-hidden">
					<div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
						<span className="text-xs font-medium text-muted-foreground">HTML / CSS</span>
						<span className="text-[10px] text-muted-foreground">
							{body.length.toLocaleString()} characters
						</span>
					</div>
					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						spellCheck={false}
						className="w-full min-h-[600px] p-4 font-mono text-sm leading-relaxed bg-zinc-950 text-zinc-100 resize-y focus:outline-none selection:bg-blue-500/30"
						placeholder="Write your HTML email template here..."
					/>
				</div>
			)}

			{/* Preview */}
			{tab === "preview" && (
				<div className="rounded-lg border overflow-hidden">
					<div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
						<span className="text-xs font-medium text-muted-foreground">Email Preview</span>
						<span className="text-[10px] text-muted-foreground">
							Rendered HTML output
						</span>
					</div>
					<div className="bg-zinc-100">
						<iframe
							ref={iframeRef}
							title="Email Preview"
							className="w-full min-h-[600px] border-0 bg-white"
							sandbox="allow-same-origin"
						/>
					</div>
				</div>
			)}

			{/* Sent Log */}
			{tab === "sent" && (
				<DataTable
					data={sentMessages}
					columns={sentColumns}
					searchKey="recipientEmail"
					searchPlaceholder="Search by email..."
					totalCount={sentTotalCount}
					emptyMessage="No emails sent with this template yet."
				/>
			)}
		</div>
	)
}
