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
import { adjustStock, updateThreshold, bulkDeleteInventory } from "./actions"
import { useLiveInventory, type LiveInventoryItem } from "@/hooks/use-live-inventory"
import { useInventoryParams } from "@/hooks/use-table-params"
import { cn } from "@/lib/utils"

interface InventoryItem {
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
	isUpdated?: boolean
}

interface InventoryTableProps {
	items: InventoryItem[]
	totalCount: number
}

function getStockStatus(item: InventoryItem): string {
	const available = item.quantity - item.reservedQuantity
	if (available <= 0) return "out_of_stock"
	if (available <= (item.lowStockThreshold ?? 10)) return "low_stock"
	return "in_stock"
}

export function InventoryTable({ items: initialItems, totalCount }: InventoryTableProps) {
	const router = useRouter()
	const [params, setParams] = useInventoryParams()
	const { items } = useLiveInventory({
		initialItems: initialItems as LiveInventoryItem[],
		onLowStock: (data) => toast.warning(`Low stock: ${data.productName}`),
		onOutOfStock: (data) => toast.error(`Out of stock: ${data.productName}`),
	})
	const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
	const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false)
	const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
	const [newQuantity, setNewQuantity] = useState("")
	const [reason, setReason] = useState("")
	const [newThreshold, setNewThreshold] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteInventory(selectedIds)
			toast.success(`Deleted ${selectedIds.length} inventory record(s)`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<InventoryItem>[] = [
		{
			key: "product",
			header: "Product",
			cell: (row) => (
				<div className={cn(row.isUpdated && "animate-pulse")}>
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
			key: "quantity",
			header: "On Hand",
			cell: (row) => (
				<span className={cn("font-medium", row.isUpdated && "text-primary")}>
					{row.quantity}
				</span>
			),
		},
		{
			key: "reserved",
			header: "Reserved",
			cell: (row) => (
				<span className="text-muted-foreground">{row.reservedQuantity}</span>
			),
		},
		{
			key: "available",
			header: "Available",
			cell: (row) => {
				const available = row.quantity - row.reservedQuantity
				return (
					<span className={available <= 0 ? "text-red-600 font-medium" : ""}>
						{available}
					</span>
				)
			},
		},
		{
			key: "threshold",
			header: "Low Threshold",
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
				<div className="flex gap-1">
					<Button
						size="sm"
						variant="ghost"
						className="h-7 px-2 text-xs"
						onClick={(e) => {
							e.stopPropagation()
							setSelectedItem(row)
							setNewQuantity(String(row.quantity))
							setReason("")
							setAdjustDialogOpen(true)
						}}
					>
						Adjust
					</Button>
				</div>
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
			toast.error("Enter a reason for the adjustment")
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

	const handleThreshold = async () => {
		if (!selectedItem) return
		const threshold = parseInt(newThreshold)
		if (isNaN(threshold) || threshold < 0) {
			toast.error("Enter a valid threshold")
			return
		}
		setLoading(true)
		try {
			await updateThreshold(selectedItem.id, threshold)
			toast.success("Threshold updated")
			setThresholdDialogOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={items}
				searchPlaceholder="Search products, SKUs..."
				totalCount={totalCount}
				currentPage={params.page}
				pageSize={25}
				onPageChange={(page) => setParams({ page })}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				onRowClick={(row) => {
					setSelectedItem(row)
					setNewQuantity(String(row.quantity))
					setReason("")
					setAdjustDialogOpen(true)
				}}
				emptyMessage="No inventory records"
				emptyDescription="Inventory is tracked when products have variants."
				filters={
					<Select
						value={params.stock}
						onValueChange={(value) => {
							setParams({ stock: value as typeof params.stock, page: 1 })
						}}
					>
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
						<DialogTitle>Adjust Stock</DialogTitle>
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
									placeholder="e.g. Restock, Damaged, Count correction"
								/>
							</div>
							<div className="flex items-center gap-2 pt-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setSelectedItem(selectedItem)
										setNewThreshold(String(selectedItem.lowStockThreshold ?? 10))
										setThresholdDialogOpen(true)
										setAdjustDialogOpen(false)
									}}
								>
									Edit Threshold
								</Button>
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

			<Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Low Stock Threshold</DialogTitle>
					</DialogHeader>
					{selectedItem && (
						<div className="space-y-4">
							<p className="text-sm text-muted-foreground">
								You&apos;ll be alerted when available stock drops to or below this number.
							</p>
							<div className="space-y-2">
								<Label>Threshold</Label>
								<Input
									type="number"
									min="0"
									value={newThreshold}
									onChange={(e) => setNewThreshold(e.target.value)}
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setThresholdDialogOpen(false)}>Cancel</Button>
						<Button onClick={handleThreshold} disabled={loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
