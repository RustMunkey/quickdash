"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { bulkDeleteReturns } from "../actions"

interface Order {
	id: string
	orderNumber: string
	status: string
	total: string
	customerName: string | null
	trackingNumber: string | null
	createdAt: Date
}

const columns: Column<Order>[] = [
	{
		key: "orderNumber",
		header: "Order",
		cell: (row) => <span className="font-medium">#{row.orderNumber}</span>,
	},
	{
		key: "customer",
		header: "Customer",
		cell: (row) => <span className="text-sm">{row.customerName ?? "—"}</span>,
	},
	{
		key: "status",
		header: "Status",
		cell: (row) => <StatusBadge status={row.status} type="order" />,
	},
	{
		key: "total",
		header: "Total",
		cell: (row) => formatCurrency(row.total),
	},
	{
		key: "createdAt",
		header: "Date",
		cell: (row) => (
			<span className="text-xs text-muted-foreground">
				{formatDate(row.createdAt)}
			</span>
		),
	},
]

interface ReturnsClientProps {
	orders: Order[]
	totalCount: number
	currentPage: number
}

export function ReturnsClient({ orders, totalCount, currentPage }: ReturnsClientProps) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState("all")
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteReturns(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} return(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const filtered = statusFilter === "all"
		? orders
		: orders.filter((o) => o.status === statusFilter)

	return (
		<DataTable
			columns={columns}
			data={filtered}
			searchPlaceholder="Search returns..."
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/orders/${row.id}`)}
			emptyMessage="No returns or refunds"
			emptyDescription="Refunded and returned orders will appear here."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			bulkActions={
				<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
					Delete ({selectedIds.length})
				</Button>
			}
			filters={
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-9 w-full sm:w-[160px]">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="refunded">Refunded</SelectItem>
						<SelectItem value="partially_refunded">Partially Refunded</SelectItem>
						<SelectItem value="returned">Returned</SelectItem>
					</SelectContent>
				</Select>
			}
		/>
	)
}
