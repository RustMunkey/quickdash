"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useLiveCustomers, type LiveCustomer } from "@/hooks/use-live-customers"
import { useCustomersParams } from "@/hooks/use-table-params"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { bulkDeleteCustomers } from "./actions"

interface CustomersTableProps {
	customers: LiveCustomer[]
	totalCount: number
}

export function CustomersTable({ customers: initialCustomers, totalCount }: CustomersTableProps) {
	const router = useRouter()
	const [params, setParams] = useCustomersParams()
	const [activityFilter, setActivityFilter] = useQueryState(
		"activity",
		parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all")
	)
	const { customers } = useLiveCustomers({ initialCustomers })
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteCustomers(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} customer(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete customers")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<LiveCustomer>[] = [
		{
			key: "name",
			header: "Customer",
			cell: (row) => (
				<div className="flex items-center gap-2">
					<div>
						<span className="text-sm font-medium">{row.name}</span>
						<p className="text-xs text-muted-foreground">{row.email}</p>
					</div>
					{row.isNew && (
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-stat-up/10 text-stat-up font-medium animate-pulse">
							NEW
						</span>
					)}
				</div>
			),
		},
		{
			key: "orders",
			header: "Orders",
			cell: (row) => <span className="text-sm">{row.orderCount}</span>,
		},
		{
			key: "spent",
			header: "Total Spent",
			cell: (row) => <span className="text-sm">{formatCurrency(row.totalSpent)}</span>,
		},
		{
			key: "lastOrder",
			header: "Last Order",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.lastOrderAt ? formatDate(row.lastOrderAt) : "Never"}
				</span>
			),
		},
		{
			key: "joined",
			header: "Joined",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{formatDate(row.createdAt)}
				</span>
			),
		},
	]

	const filtered = activityFilter === "all"
		? customers
		: activityFilter === "active"
			? customers.filter((c) => c.orderCount > 0)
			: customers.filter((c) => c.orderCount === 0)

	return (
		<DataTable
			columns={columns}
			data={filtered}
			searchPlaceholder="Search customers..."
			totalCount={totalCount}
			currentPage={params.page}
			pageSize={25}
			onPageChange={(page) => setParams({ page })}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/customers/${row.id}`)}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			emptyMessage="No customers yet"
			emptyDescription="Customers will appear here when they create accounts."
			filters={
				<Select value={activityFilter ?? "all"} onValueChange={(v) => setActivityFilter(v as "all" | "active" | "inactive")}>
					<SelectTrigger className="h-9 w-full sm:w-[150px]">
						<SelectValue placeholder="All Customers" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Customers</SelectItem>
						<SelectItem value="active">Has Orders</SelectItem>
						<SelectItem value="inactive">No Orders</SelectItem>
					</SelectContent>
				</Select>
			}
		/>
	)
}
