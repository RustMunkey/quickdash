"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import { bulkDeleteTrackingEvents } from "../actions"

interface TrackingItem {
	id: string
	orderId: string
	carrierId: string
	trackingNumber: string
	status: string
	estimatedDelivery: Date | null
	lastUpdatedAt: Date
	createdAt: Date
	carrierName: string
	orderNumber: string
}

interface TrackingClientProps {
	items: TrackingItem[]
	totalCount: number
	currentPage: number
	currentStatus?: string
}

const statuses = ["pending", "in_transit", "out_for_delivery", "delivered", "exception", "returned"]

export function TrackingClient({ items, totalCount, currentPage, currentStatus }: TrackingClientProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteTrackingEvents(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} tracking event(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<TrackingItem>[] = [
		{
			key: "order",
			header: "Order",
			cell: (row) => <span className="text-sm font-medium">#{row.orderNumber}</span>,
		},
		{
			key: "carrier",
			header: "Carrier",
			cell: (row) => <span className="text-sm">{row.carrierName}</span>,
		},
		{
			key: "tracking",
			header: "Tracking",
			cell: (row) => (
				<span className="text-xs font-mono text-muted-foreground">{row.trackingNumber}</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="tracking" />,
		},
		{
			key: "estimated",
			header: "Est. Delivery",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.estimatedDelivery ? formatDate(row.estimatedDelivery) : "—"}
				</span>
			),
		},
		{
			key: "updated",
			header: "Last Update",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{formatDate(row.lastUpdatedAt)}</span>
			),
		},
	]

	return (
		<>
		<div>
			<p className="text-sm text-muted-foreground">Carrier-provided tracking updates for shipments.</p>
		</div>
		<DataTable
			columns={columns}
			data={items}
			searchPlaceholder="Search tracking..."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			getId={(row) => row.id}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			bulkActions={
				<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
					Delete ({selectedIds.length})
				</Button>
			}
			emptyMessage="No shipments tracked"
			emptyDescription="Tracking info will appear here for shipped orders."
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
						router.push(`/shipping/tracking?${params.toString()}`)
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
