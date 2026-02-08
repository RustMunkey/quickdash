"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useLiveSubscriptions, type LiveSubscription } from "@/hooks/use-live-subscriptions"
import { useSubscriptionsParams } from "@/hooks/use-table-params"
import { bulkDeleteSubscriptions } from "./actions"

interface SubscriptionsTableProps {
	subscriptions: LiveSubscription[]
	totalCount: number
	currentStatus?: string
	basePath?: string
	description?: string
}

const statuses = ["active", "paused", "cancelled", "dunning"]

export function SubscriptionsTable({
	subscriptions: initialSubscriptions,
	totalCount,
	currentStatus,
	basePath = "/subscriptions",
	description = "Manage recurring delivery subscriptions.",
}: SubscriptionsTableProps) {
	const router = useRouter()
	const [params, setParams] = useSubscriptionsParams()
	const { subscriptions } = useLiveSubscriptions({ initialSubscriptions })
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteSubscriptions(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} subscription(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete subscriptions")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<LiveSubscription>[] = [
		{
			key: "customer",
			header: "Customer",
			cell: (row) => (
				<div className="flex items-center gap-2">
					<div>
						<span className="text-sm font-medium">{row.customerName ?? "—"}</span>
						{row.customerEmail && (
							<p className="text-xs text-muted-foreground">{row.customerEmail}</p>
						)}
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
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="subscription" />,
		},
		{
			key: "frequency",
			header: "Frequency",
			cell: (row) => (
				<span className="text-sm capitalize">{row.frequency.replace(/_/g, " ")}</span>
			),
		},
		{
			key: "price",
			header: "Price",
			cell: (row) => (
				<span className="text-sm">{formatCurrency(row.pricePerDelivery)}</span>
			),
		},
		{
			key: "nextDelivery",
			header: "Next Delivery",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.nextDeliveryAt ? formatDate(row.nextDeliveryAt) : "—"}
				</span>
			),
		},
		{
			key: "deliveries",
			header: "Deliveries",
			cell: (row) => (
				<span className="text-sm">{row.totalDeliveries ?? 0}</span>
			),
		},
		{
			key: "createdAt",
			header: "Started",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{formatDate(row.createdAt)}
				</span>
			),
		},
	]

	return (
		<>
		<p className="text-sm text-muted-foreground">{description}</p>
		<DataTable
			columns={columns}
			data={subscriptions}
			searchPlaceholder="Search subscriptions..."
			totalCount={totalCount}
			currentPage={params.page}
			pageSize={25}
			onPageChange={(page) => setParams({ page })}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/subscriptions/${row.id}`)}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			emptyMessage="No subscriptions"
			emptyDescription="Subscriptions will appear here."
			filters={
				<Select
					value={currentStatus ?? "all"}
					onValueChange={(value) => {
						if (value === "all") {
							router.push("/subscriptions")
						} else if (value === "cancelled") {
							router.push("/subscriptions/canceled")
						} else {
							router.push(`/subscriptions/${value}`)
						}
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
		</>
	)
}
