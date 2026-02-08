"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { deleteSitePage, bulkDeleteSitePages } from "../actions"

type SitePage = {
	id: string
	title: string
	slug: string
	status: string
	updatedAt: Date
}

interface PagesTableProps {
	pages: SitePage[]
	totalCount: number
	currentPage: number
}

export function PagesTable({ pages, totalCount, currentPage }: PagesTableProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteSitePages(selectedIds)
			toast.success(`Deleted ${selectedIds.length} page(s)`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<SitePage>[] = [
		{
			key: "title",
			header: "Title",
			cell: (row) => <span className="font-medium">{row.title}</span>,
		},
		{
			key: "slug",
			header: "Slug",
			cell: (row) => <span className="text-muted-foreground">/{row.slug}</span>,
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="content" />,
		},
		{
			key: "updatedAt",
			header: "Last Updated",
			cell: (row) => new Date(row.updatedAt).toLocaleDateString("en-US"),
		},
	]

	return (
		<DataTable
			data={pages}
			columns={columns}
			searchKey="title"
			searchPlaceholder="Search pages..."
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			onRowClick={(row) => router.push(`/content/pages/${row.id}`)}
			totalCount={totalCount}
			currentPage={currentPage}
			filters={
				<Button size="sm" className="h-9 hidden sm:flex" onClick={() => router.push("/content/pages/new")}>New Page</Button>
			}
		/>
	)
}
