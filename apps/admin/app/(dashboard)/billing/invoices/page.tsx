"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, Column } from "@/components/data-table"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type Invoice = {
	id: string
	number: string
	date: string
	dueDate: string
	amount: number
	status: "paid" | "pending" | "overdue" | "draft"
	description: string
}

function getStatusBadge(status: Invoice["status"]) {
	switch (status) {
		case "paid":
			return <Badge className="bg-green-600 hover:bg-green-600">Paid</Badge>
		case "pending":
			return <Badge variant="secondary">Pending</Badge>
		case "overdue":
			return <Badge variant="destructive">Overdue</Badge>
		case "draft":
			return <Badge variant="outline">Draft</Badge>
	}
}

export default function InvoicesPage() {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = React.useState("all")
	const [selectedIds, setSelectedIds] = React.useState<string[]>([])
	const [loading, setLoading] = React.useState(false)

	// Placeholder — will be fetched from Polar
	const invoices: Invoice[] = []

	const filtered = statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter)

	const handleBulkDelete = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			// TODO: Implement bulk delete when invoices are fetched from Polar
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} invoice(s)`)
		} catch {
			toast.error("Failed to delete invoices")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Invoice>[] = [
		{
			key: "number",
			header: "Invoice",
			cell: (inv) => (
				<div>
					<p className="font-medium">{inv.number}</p>
					<p className="text-xs text-muted-foreground">{inv.description}</p>
				</div>
			),
		},
		{
			key: "date",
			header: "Date",
			cell: (inv) => (
				<span className="text-sm">{new Date(inv.date).toLocaleDateString()}</span>
			),
		},
		{
			key: "amount",
			header: "Amount",
			cell: (inv) => (
				<span className="text-sm font-medium">${(inv.amount / 100).toFixed(2)}</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (inv) => getStatusBadge(inv.status),
		},
		{
			key: "actions",
			header: "",
			cell: () => (
				<Button variant="ghost" size="sm" className="h-7 text-xs">
					Download
				</Button>
			),
		},
	]

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				View and download your billing invoices.
			</p>

			<DataTable
				columns={columns}
				data={filtered}
				totalCount={filtered.length}
				getId={(row) => row.id}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={
					<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDelete}>
						Delete ({selectedIds.length})
					</Button>
				}
				emptyMessage="No invoices yet. Invoices will appear here when you upgrade your plan."
				filters={
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="h-9 w-[130px] text-xs">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="paid">Paid</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="overdue">Overdue</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
						</SelectContent>
					</Select>
				}
			/>
		</div>
	)
}
