"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { bulkDeletePurchaseOrders } from "../actions"

interface PurchaseOrder {
	id: string
	poNumber: string
	supplierId: string
	status: string
	total: string
	expectedDelivery: Date | null
	receivedAt: Date | null
	createdAt: Date
	supplierName: string
}

interface POTableProps {
	orders: PurchaseOrder[]
	totalCount: number
	currentPage: number
	currentStatus?: string
}

const statuses = ["draft", "submitted", "confirmed", "shipped", "received", "cancelled"]

export function POTable({ orders, totalCount, currentPage, currentStatus }: POTableProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeletePurchaseOrders(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} purchase order(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete purchase orders")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<PurchaseOrder>[] = [
		{
			key: "poNumber",
			header: "PO #",
			cell: (row) => <span className="text-sm font-medium font-mono">{row.poNumber}</span>,
		},
		{
			key: "supplier",
			header: "Supplier",
			cell: (row) => <span className="text-sm">{row.supplierName}</span>,
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="purchaseOrder" />,
		},
		{
			key: "total",
			header: "Total",
			cell: (row) => <span className="text-sm">{formatCurrency(row.total)}</span>,
		},
		{
			key: "expected",
			header: "Expected",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.expectedDelivery ? formatDate(row.expectedDelivery) : "—"}
				</span>
			),
		},
		{
			key: "createdAt",
			header: "Created",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
			),
		},
	]

	return (
		<DataTable
			columns={columns}
			data={orders}
			searchPlaceholder="Search purchase orders..."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/suppliers/purchase-orders/${row.id}`)}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			emptyMessage="No purchase orders"
			emptyDescription="Create a purchase order to restock from suppliers."
			filters={
				<Select
					value={currentStatus ?? "all"}
					onValueChange={(value) => {
						const params = new URLSearchParams(window.location.search)
						if (value && value !== "all") {
							params.set("status", value)
						} else {
							params.delete("status")
						}
						params.delete("page")
						router.push(`/suppliers/purchase-orders?${params.toString()}`)
					}}
				>
					<SelectTrigger className="h-9 w-full sm:w-[160px]">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						{statuses.map((s) => (
							<SelectItem key={s} value={s}>
								{s.replace(/\b\w/g, (c) => c.toUpperCase())}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
		/>
	)
}
