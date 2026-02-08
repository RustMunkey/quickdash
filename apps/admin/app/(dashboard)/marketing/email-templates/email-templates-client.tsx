"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { toggleTemplate, deleteEmailTemplate, bulkDeleteEmailTemplates } from "./actions"

type EmailTemplate = {
	id: string
	name: string
	slug: string
	subject: string
	isActive: boolean | null
	updatedAt: Date
}

type SentMessage = {
	id: string
	recipientEmail: string
	subject: string
	status: string
	sentAt: Date
}

interface EmailTemplatesClientProps {
	templates: EmailTemplate[]
	templatesTotalCount: number
	templatesCurrentPage: number
	sentMessages: SentMessage[]
	sentTotalCount: number
	sentCurrentPage: number
}

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

export function EmailTemplatesClient({
	templates: initial,
	templatesTotalCount,
	templatesCurrentPage,
	sentMessages,
	sentTotalCount,
	sentCurrentPage,
}: EmailTemplatesClientProps) {
	const router = useRouter()
	const [tab, setTab] = useState<"templates" | "sent">("templates")
	const [templates, setTemplates] = useState(initial)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		const count = selectedIds.length
		setLoading(true)
		try {
			await bulkDeleteEmailTemplates(selectedIds)
			const deletedIds = [...selectedIds]
			setSelectedIds([])
			setTemplates((prev) => prev.filter((t) => !deletedIds.includes(t.id)))
			toast.success(`Deleted ${count} template(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	async function handleToggle(id: string, current: boolean) {
		await toggleTemplate(id, !current)
		setTemplates((prev) =>
			prev.map((t) => (t.id === id ? { ...t, isActive: !current } : t))
		)
		toast.success(`Template ${!current ? "activated" : "deactivated"}`)
	}

	async function handleDelete(id: string, name: string) {
		if (!confirm(`Delete "${name}"?`)) return
		try {
			await deleteEmailTemplate(id)
			setTemplates((prev) => prev.filter((t) => t.id !== id))
			toast.success("Template deleted")
		} catch {
			toast.error("Failed to delete template")
		}
	}

	const columns: Column<EmailTemplate>[] = [
		{
			key: "name",
			header: "Name",
			cell: (row) => <span className="font-medium">{row.name}</span>,
		},
		{
			key: "slug",
			header: "Slug",
			cell: (row) => <span className="text-muted-foreground font-mono text-xs">{row.slug}</span>,
		},
		{
			key: "subject",
			header: "Subject",
			cell: (row) => <span className="truncate max-w-[200px] block">{row.subject}</span>,
		},
		{
			key: "isActive",
			header: "Active",
			cell: (row) => (
				<Switch
					checked={row.isActive ?? true}
					onCheckedChange={() => handleToggle(row.id, row.isActive ?? true)}
					onClick={(e) => e.stopPropagation()}
				/>
			),
		},
		{
			key: "updatedAt",
			header: "Updated",
			cell: (row) => new Date(row.updatedAt).toLocaleDateString("en-US"),
		},
		{
			key: "actions",
			header: "",
			cell: (row) => (
				<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={() => router.push(`/marketing/email-templates/${row.id}`)}
					>
						<HugeiconsIcon icon={PencilEdit02Icon} size={14} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-destructive hover:text-destructive"
						onClick={() => handleDelete(row.id, row.name)}
					>
						<HugeiconsIcon icon={Delete02Icon} size={14} />
					</Button>
				</div>
			),
		},
	]

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Create and manage HTML email templates. Connect to Resend to send transactional emails.
				</p>
				<div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/30 shrink-0">
					<Button
						size="sm"
						variant={tab === "templates" ? "default" : "ghost"}
						className="h-7 text-xs px-3"
						onClick={() => setTab("templates")}
					>
						Templates
					</Button>
					<Button
						size="sm"
						variant={tab === "sent" ? "default" : "ghost"}
						className="h-7 text-xs px-3"
						onClick={() => setTab("sent")}
					>
						Sent Log
					</Button>
				</div>
			</div>

			{tab === "templates" && (
				<DataTable
					data={templates}
					columns={columns}
					searchKey="name"
					searchPlaceholder="Search templates..."
					onRowClick={(row) => router.push(`/marketing/email-templates/${row.id}`)}
					totalCount={templatesTotalCount}
					currentPage={templatesCurrentPage}
					getId={(row) => row.id}
					selectable
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					bulkActions={
						<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
							Delete ({selectedIds.length})
						</Button>
					}
					filters={
						<Button
							size="sm"
							className="h-9"
							onClick={() => router.push("/marketing/email-templates/new")}
						>
							New Template
						</Button>
					}
				/>
			)}

			{tab === "sent" && (
				<DataTable
					data={sentMessages}
					columns={sentColumns}
					searchKey="recipientEmail"
					searchPlaceholder="Search by email..."
					totalCount={sentTotalCount}
					currentPage={sentCurrentPage}
					emptyMessage="No emails sent yet. Emails will appear here when templates are used."
				/>
			)}
		</div>
	)
}
