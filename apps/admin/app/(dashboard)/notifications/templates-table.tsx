"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toggleTemplate } from "./actions"

type EmailTemplate = {
	id: string
	name: string
	slug: string
	subject: string
	isActive: boolean | null
	updatedAt: Date
}

interface TemplatesTableProps {
	templates: EmailTemplate[]
	totalCount: number
	currentPage: number
}

export function TemplatesTable({ templates: initial, totalCount, currentPage }: TemplatesTableProps) {
	const router = useRouter()
	const [templates, setTemplates] = useState(initial)

	async function handleToggle(id: string, current: boolean) {
		await toggleTemplate(id, !current)
		setTemplates((prev) =>
			prev.map((t) => (t.id === id ? { ...t, isActive: !current } : t))
		)
		toast.success(`Template ${!current ? "activated" : "deactivated"}`)
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
			header: "Last Updated",
			cell: (row) => new Date(row.updatedAt).toLocaleDateString("en-US"),
		},
	]

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => router.push("/notifications/new")}>New Template</Button>
			</div>
			<DataTable
				data={templates}
				columns={columns}
				searchKey="name"
				searchPlaceholder="Search templates..."
				onRowClick={(row) => router.push(`/notifications/${row.id}`)}
				totalCount={totalCount}
				currentPage={currentPage}
			/>
		</div>
	)
}
