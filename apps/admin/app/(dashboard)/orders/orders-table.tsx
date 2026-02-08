"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useLiveOrders, type LiveOrder } from "@/hooks/use-live-orders"
import { useOrdersParams } from "@/hooks/use-table-params"
import { cn } from "@/lib/utils"
import { bulkDeleteOrders } from "./actions"

interface Order {
	id: string
	orderNumber: string
	status: string
	total: string
	customerName: string | null
	customerEmail: string | null
	createdAt: Date
	isNew?: boolean
}

interface OrdersTableProps {
	orders: Order[]
	totalCount: number
}

const statuses = [
	"pending", "confirmed", "processing", "packed",
	"shipped", "delivered", "cancelled", "refunded",
	"partially_refunded", "returned",
]

export function OrdersTable({ orders: initialOrders, totalCount }: OrdersTableProps) {
	const router = useRouter()
	const [params, setParams] = useOrdersParams()
	const { orders } = useLiveOrders({ initialOrders: initialOrders as LiveOrder[] })
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteOrders(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} order(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete orders")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Order>[] = [
		{
			key: "orderNumber",
			header: "Order",
			cell: (row) => (
				<span className={cn("font-medium", row.isNew && "text-primary")}>
					#{row.orderNumber}
					{row.isNew && <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">NEW</span>}
				</span>
			),
		},
		{
			key: "customer",
			header: "Customer",
			cell: (row) => (
				<div>
					<span className="text-sm">{row.customerName ?? "—"}</span>
					{row.customerEmail && (
						<p className="text-xs text-muted-foreground">{row.customerEmail}</p>
					)}
				</div>
			),
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

	return (
		<DataTable
			columns={columns}
			data={orders}
			searchPlaceholder="Search orders..."
			totalCount={totalCount}
			currentPage={params.page}
			pageSize={25}
			onPageChange={(page) => setParams({ page })}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/orders/${row.id}`)}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			emptyMessage="No orders yet"
			emptyDescription="Orders will appear here when customers make purchases."
			filters={
				<Select
					value={params.status}
					onValueChange={(value) => {
						setParams({
							status: value as typeof params.status,
							page: 1, // Reset to first page on filter change
						})
					}}
				>
					<SelectTrigger className="h-9 w-full sm:w-[160px]">
						<SelectValue placeholder="All Statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						{statuses.map((s) => (
							<SelectItem key={s} value={s}>
								{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			}
		/>
	)
}
