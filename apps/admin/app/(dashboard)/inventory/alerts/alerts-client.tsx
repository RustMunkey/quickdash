"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { adjustStock, bulkDeleteAlerts } from "../actions"

interface AlertItem {
	id: string
	variantId: string
	quantity: number
	reservedQuantity: number
	lowStockThreshold: number | null
	updatedAt: Date
	variantName: string
	variantSku: string
	productName: string
	productId: string
}

function getStockStatus(item: AlertItem): string {
	const available = item.quantity - item.reservedQuantity
	if (available <= 0) return "out_of_stock"
	return "low_stock"
}

interface AlertsClientProps {
	items: AlertItem[]
	totalCount: number
	currentPage: number
}

export function AlertsClient({ items, totalCount, currentPage }: AlertsClientProps) {
	const router = useRouter()
	const [stockFilter, setStockFilter] = useState("all")
	const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
	const [selectedItem, setSelectedItem] = useState<AlertItem | null>(null)
	const [newQuantity, setNewQuantity] = useState("")
	const [reason, setReason] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteAlerts(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} alert(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<AlertItem>[] = [
		{
			key: "product",
			header: "Product",
			cell: (row) => (
				<div>
					<span className="font-medium text-sm">{row.productName}</span>
					<span className="block text-xs text-muted-foreground">{row.variantName}</span>
				</div>
			),
		},
		{
			key: "sku",
			header: "SKU",
			cell: (row) => (
				<span className="text-xs text-muted-foreground font-mono">{row.variantSku}</span>
			),
		},
		{
			key: "available",
			header: "Available",
			cell: (row) => {
				const available = row.quantity - row.reservedQuantity
				return (
					<span className={available <= 0 ? "text-red-600 font-medium" : "text-yellow-600 font-medium"}>
						{available}
					</span>
				)
			},
		},
		{
			key: "threshold",
			header: "Threshold",
			cell: (row) => (
				<span className="text-muted-foreground">{row.lowStockThreshold ?? 10}</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={getStockStatus(row)} type="inventory" />,
		},
		{
			key: "actions",
			header: "",
			className: "w-10",
			cell: (row) => (
				<Button
					size="sm"
					variant="outline"
					className="h-7 px-2 text-xs"
					onClick={(e) => {
						e.stopPropagation()
						setSelectedItem(row)
						setNewQuantity(String(row.quantity))
						setReason("Restock")
						setAdjustDialogOpen(true)
					}}
				>
					Restock
				</Button>
			),
		},
	]

	const handleAdjust = async () => {
		if (!selectedItem) return
		const qty = parseInt(newQuantity)
		if (isNaN(qty) || qty < 0) {
			toast.error("Enter a valid quantity")
			return
		}
		if (!reason.trim()) {
			toast.error("Enter a reason")
			return
		}
		setLoading(true)
		try {
			await adjustStock(selectedItem.id, qty, reason.trim())
			toast.success("Stock adjusted")
			setAdjustDialogOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const filtered = stockFilter === "all"
		? items
		: items.filter((i) => getStockStatus(i) === stockFilter)

	return (
		<>
			<DataTable
				columns={columns}
				data={filtered}
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				searchPlaceholder="Search alerts..."
				getId={(row) => row.id}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={
					<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
						Delete ({selectedIds.length})
					</Button>
				}
				onRowClick={(row) => {
					setSelectedItem(row)
					setNewQuantity(String(row.quantity))
					setReason("Restock")
					setAdjustDialogOpen(true)
				}}
				emptyMessage="All stock levels are healthy"
				emptyDescription="No items are below their low stock threshold."
				filters={
					<Select value={stockFilter} onValueChange={setStockFilter}>
						<SelectTrigger className="h-9 w-full sm:w-[150px]">
							<SelectValue placeholder="All Stock" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Stock</SelectItem>
							<SelectItem value="low_stock">Low Stock</SelectItem>
							<SelectItem value="out_of_stock">Out of Stock</SelectItem>
						</SelectContent>
					</Select>
				}
			/>

			<Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Restock Item</DialogTitle>
					</DialogHeader>
					{selectedItem && (
						<div className="space-y-4">
							<div>
								<p className="text-sm font-medium">{selectedItem.productName}</p>
								<p className="text-xs text-muted-foreground">{selectedItem.variantName} ({selectedItem.variantSku})</p>
								<p className="text-xs text-muted-foreground mt-1">
									Current: {selectedItem.quantity} on hand, {selectedItem.reservedQuantity} reserved
								</p>
							</div>
							<div className="space-y-2">
								<Label>New Quantity</Label>
								<Input
									type="number"
									min="0"
									value={newQuantity}
									onChange={(e) => setNewQuantity(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Reason</Label>
								<Input
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="e.g. Restock, Shipment received"
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
						<Button onClick={handleAdjust} disabled={loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
