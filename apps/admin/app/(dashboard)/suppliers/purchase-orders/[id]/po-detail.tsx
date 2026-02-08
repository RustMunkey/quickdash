"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updatePurchaseOrderStatus, deletePurchaseOrder } from "../../actions"

interface PODetailProps {
	order: {
		id: string
		poNumber: string
		supplierId: string
		status: string
		subtotal: string
		shippingCost: string | null
		total: string
		expectedDelivery: Date | null
		receivedAt: Date | null
		notes: string | null
		createdAt: Date
		updatedAt: Date
		supplierName: string
		items: Array<{
			id: string
			variantId: string
			quantity: number
			unitCost: string
			totalCost: string
			receivedQuantity: number | null
			variantName: string
			variantSku: string
			productName: string
		}>
	}
}

const statuses = ["draft", "submitted", "confirmed", "shipped", "received", "cancelled"]

export function PODetail({ order }: PODetailProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(order.id, order.poNumber)

	const handleStatusChange = async (status: string) => {
		setLoading(true)
		try {
			await updatePurchaseOrderStatus(order.id, status)
			toast.success(`Status updated to ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update status")
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		setLoading(true)
		try {
			await deletePurchaseOrder(order.id)
			toast.success("Purchase order deleted")
			router.push("/suppliers/purchase-orders")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">{order.poNumber}</h2>
					<StatusBadge status={order.status} type="purchaseOrder" />
				</div>
				<div className="flex items-center gap-2">
					<Select value={order.status} onValueChange={handleStatusChange} disabled={loading}>
						<SelectTrigger className="h-9 w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statuses.map((s) => (
								<SelectItem key={s} value={s}>
									{s.replace(/\b\w/g, (c) => c.toUpperCase())}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete {order.poNumber}?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this purchase order.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border p-4">
						<h3 className="text-sm font-medium mb-3">Items</h3>
						{order.items.length === 0 ? (
							<p className="text-sm text-muted-foreground">No items in this order.</p>
						) : (
							<div className="space-y-3">
								{order.items.map((item) => (
									<div key={item.id} className="flex items-center justify-between">
										<div>
											<p className="text-sm font-medium">{item.productName}</p>
											<p className="text-xs text-muted-foreground">
												{item.variantName} &middot; SKU: {item.variantSku}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm">
												{item.quantity} &times; {formatCurrency(item.unitCost)}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatCurrency(item.totalCost)}
												{item.receivedQuantity != null && item.receivedQuantity > 0 && (
													<> &middot; {item.receivedQuantity} received</>
												)}
											</p>
										</div>
									</div>
								))}
								<div className="border-t pt-3 space-y-1">
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Subtotal</span>
										<span>{formatCurrency(order.subtotal)}</span>
									</div>
									{order.shippingCost && parseFloat(order.shippingCost) > 0 && (
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Shipping</span>
											<span>{formatCurrency(order.shippingCost)}</span>
										</div>
									)}
									<div className="flex justify-between text-sm font-medium">
										<span>Total</span>
										<span>{formatCurrency(order.total)}</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{order.notes && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Notes</h3>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Supplier</span>
								<Button
									variant="link"
									size="sm"
									className="h-auto p-0 text-sm"
									onClick={() => router.push(`/suppliers/${order.supplierId}`)}
								>
									{order.supplierName}
								</Button>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Expected</span>
								<span>{order.expectedDelivery ? formatDate(order.expectedDelivery) : "—"}</span>
							</div>
							{order.receivedAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Received</span>
									<span>{formatDate(order.receivedAt)}</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span>{formatDate(order.createdAt)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span>{formatDate(order.updatedAt)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
