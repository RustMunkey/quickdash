"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { updateOrderStatus, bulkUpdateOrderStatus } from "../actions"

interface Order {
	id: string
	orderNumber: string
	status: string
	total: string
	customerName: string | null
	trackingNumber: string | null
	createdAt: Date
}

interface FulfillmentClientProps {
	orders: Order[]
	totalCount: number
	currentPage: number
}

export function FulfillmentClient({ orders, totalCount, currentPage }: FulfillmentClientProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [statusFilter, setStatusFilter] = useState("all")

	const handleStatusChange = async (id: string, status: string) => {
		try {
			await updateOrderStatus(id, status)
			toast.success(`Order updated to ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleBulkStatus = async (status: string) => {
		setLoading(true)
		try {
			await bulkUpdateOrderStatus(selectedIds, status)
			toast.success(`${selectedIds.length} orders updated to ${status}`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
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
		{
			key: "action",
			header: "",
			cell: (row) => {
				const nextStatus =
					row.status === "confirmed" ? "processing" :
					row.status === "processing" ? "packed" :
					"shipped"
				return (
					<div className="flex justify-end">
						<Button
							size="sm"
							variant="outline"
							onClick={(e) => {
								e.stopPropagation()
								handleStatusChange(row.id, nextStatus)
							}}
						>
							{nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
						</Button>
					</div>
				)
			},
		},
	]

	const filtered = statusFilter === "all"
		? orders
		: orders.filter((o) => o.status === statusFilter)

	return (
		<DataTable
			columns={columns}
			data={filtered}
			searchPlaceholder="Search fulfillment..."
			getId={(row) => row.id}
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			emptyMessage="No orders to fulfill"
			emptyDescription="Confirmed and processing orders will appear here."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			filters={
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-9 w-full sm:w-[160px]">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="confirmed">Confirmed</SelectItem>
						<SelectItem value="processing">Processing</SelectItem>
						<SelectItem value="packed">Packed</SelectItem>
					</SelectContent>
				</Select>
			}
			bulkActions={
				selectedIds.length > 0 ? (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
						<Button size="sm" variant="outline" disabled={loading} onClick={() => handleBulkStatus("processing")}>
							Processing
						</Button>
						<Button size="sm" variant="outline" disabled={loading} onClick={() => handleBulkStatus("packed")}>
							Packed
						</Button>
						<Button size="sm" variant="outline" disabled={loading} onClick={() => handleBulkStatus("shipped")}>
							Shipped
						</Button>
					</div>
				) : undefined
			}
		/>
	)
}
