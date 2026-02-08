"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/status-badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateOrderStatus, addTracking, removeTracking, processRefund, cancelOrder, clearOrderActivity, getShippingRatesForOrder, generateShippingLabel, type ParcelDimensions } from "../actions"
import { detectCarrier, type CarrierInfo } from "@/lib/tracking/carrier-detector"
import { TrackingTimeline } from "@/components/tracking-timeline"

interface TrackingData {
	id: string
	trackingNumber: string
	status: string
	statusHistory: Array<{ status: string; timestamp: string; location?: string }>
	estimatedDelivery: Date | null
	lastUpdatedAt: Date
	carrierName: string
}

interface ShippingRate {
	object_id: string
	provider: string
	servicelevel: { name: string; token: string }
	amount: string
	currency: string
	estimated_days: number
	duration_terms: string
}

interface GeneratedLabel {
	trackingNumber: string
	trackingUrl: string
	labelUrl: string
	carrier: string
	service: string
	cost: string
}

interface OrderDetailProps {
	order: {
		id: string
		orderNumber: string
		status: string
		subtotal: string
		discountAmount: string | null
		taxAmount: string | null
		shippingAmount: string | null
		total: string
		trackingNumber: string | null
		trackingUrl: string | null
		customerNotes: string | null
		shippedAt: Date | null
		deliveredAt: Date | null
		createdAt: Date
		customer: { name: string; email: string; phone: string | null } | null
		items: Array<{
			id: string
			productName: string
			variantName: string
			sku: string
			unitPrice: string
			quantity: number
			totalPrice: string
		}>
		payment: {
			method: string | null
			provider: string | null
			status: string | null
			amount: string | null
			walletAddress: string | null
			txHash: string | null
		} | null
		shippingAddress: {
			firstName: string
			lastName: string
			addressLine1: string
			addressLine2: string | null
			city: string
			state: string
			postalCode: string
			country: string
		} | null
	}
	activity: Array<{
		id: string
		action: string
		userName: string
		metadata: Record<string, unknown> | null
		createdAt: Date
	}>
	tracking?: TrackingData | null
}

const statusFlow = ["pending", "confirmed", "processing", "packed", "shipped", "delivered"]

function formatAction(action: string, metadata: Record<string, unknown> | null): string {
	const parts = action.split(".")
	const verb = parts[1] ?? parts[0]
	if (metadata?.action === "status_updated") return `Status → ${metadata.newStatus}`
	if (metadata?.action === "tracking_added") return `Tracking added`
	if (metadata?.action === "tracking_removed") return `Tracking removed`
	if (metadata?.action === "cancelled") return `Order cancelled`
	if (verb === "refunded") return `Refund processed`
	if (verb === "created") return `Order created`
	if (verb === "updated") return `Order updated`
	return verb.charAt(0).toUpperCase() + verb.slice(1)
}

export function OrderDetail({ order, activity, tracking }: OrderDetailProps) {
	const router = useRouter()
	useBreadcrumbOverride(order.id, `#${order.orderNumber}`)
	const [statusDialog, setStatusDialog] = useState(false)
	const [trackingDialog, setTrackingDialog] = useState(false)
	const [refundDialog, setRefundDialog] = useState(false)
	const [loading, setLoading] = useState(false)

	const [newStatus, setNewStatus] = useState(order.status)
	const [trackingNumber, setTrackingNumber] = useState("")
	const [trackingUrl, setTrackingUrl] = useState("")
	const [detectedCarrier, setDetectedCarrier] = useState<CarrierInfo | null>(null)
	const [refundAmount, setRefundAmount] = useState(order.total)
	const [refundReason, setRefundReason] = useState("")

	// Label generation state
	const [labelDialog, setLabelDialog] = useState(false)
	const [labelStep, setLabelStep] = useState<"dimensions" | "rates" | "success">("dimensions")
	const [parcelLength, setParcelLength] = useState("6")
	const [parcelWidth, setParcelWidth] = useState("4")
	const [parcelHeight, setParcelHeight] = useState("3")
	const [parcelWeight, setParcelWeight] = useState("1")
	const [distanceUnit, setDistanceUnit] = useState<"in" | "cm">("in")
	const [massUnit, setMassUnit] = useState<"lb" | "kg" | "oz" | "g">("lb")
	const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
	const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
	const [generatedLabel, setGeneratedLabel] = useState<GeneratedLabel | null>(null)
	const [fetchingRates, setFetchingRates] = useState(false)
	const [purchasingLabel, setPurchasingLabel] = useState(false)

	// Auto-detect carrier when tracking number changes
	const handleTrackingNumberChange = (value: string) => {
		setTrackingNumber(value)
		if (value.trim().length >= 10) {
			const carrier = detectCarrier(value)
			setDetectedCarrier(carrier)
			if (carrier && !trackingUrl) {
				setTrackingUrl(carrier.trackingUrl)
			}
		} else {
			setDetectedCarrier(null)
		}
	}

	const handleStatusUpdate = async () => {
		setLoading(true)
		try {
			await updateOrderStatus(order.id, newStatus)
			toast.success(`Status updated to ${newStatus}`)
			setStatusDialog(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleAddTracking = async () => {
		if (!trackingNumber.trim()) {
			toast.error("Tracking number is required")
			return
		}
		setLoading(true)
		try {
			await addTracking(order.id, trackingNumber, trackingUrl)
			toast.success("Tracking info added")
			setTrackingDialog(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleRefund = async () => {
		if (!refundReason.trim()) {
			toast.error("Reason is required")
			return
		}
		setLoading(true)
		try {
			await processRefund(order.id, refundAmount, refundReason)
			toast.success("Refund processed")
			setRefundDialog(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleCancel = async () => {
		setLoading(true)
		try {
			await cancelOrder(order.id)
			toast.success("Order cancelled")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const isCancellable = !["cancelled", "refunded", "delivered"].includes(order.status)

	const handleGetRates = async () => {
		setFetchingRates(true)
		try {
			const parcel: ParcelDimensions = {
				length: parseFloat(parcelLength),
				width: parseFloat(parcelWidth),
				height: parseFloat(parcelHeight),
				weight: parseFloat(parcelWeight),
				distanceUnit,
				massUnit,
			}
			const result = await getShippingRatesForOrder(order.id, parcel)
			setShippingRates(result.rates as ShippingRate[])
			if (result.rates.length > 0) {
				setSelectedRateId(result.rates[0].object_id)
			}
			setLabelStep("rates")
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setFetchingRates(false)
		}
	}

	const handlePurchaseLabel = async () => {
		if (!selectedRateId) {
			toast.error("Please select a shipping rate")
			return
		}
		const selectedRate = shippingRates.find(r => r.object_id === selectedRateId)
		if (!selectedRate) return

		setPurchasingLabel(true)
		try {
			const parcel: ParcelDimensions = {
				length: parseFloat(parcelLength),
				width: parseFloat(parcelWidth),
				height: parseFloat(parcelHeight),
				weight: parseFloat(parcelWeight),
				distanceUnit,
				massUnit,
			}
			const label = await generateShippingLabel(order.id, parcel, selectedRate.servicelevel.token)
			setGeneratedLabel(label)
			setLabelStep("success")
			toast.success("Shipping label generated!")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setPurchasingLabel(false)
		}
	}

	const handlePrintLabel = () => {
		if (!generatedLabel?.labelUrl) return
		const printWindow = window.open(generatedLabel.labelUrl, "_blank")
		if (printWindow) {
			printWindow.addEventListener("load", () => {
				printWindow.print()
			})
		}
	}

	const resetLabelDialog = () => {
		setLabelStep("dimensions")
		setShippingRates([])
		setSelectedRateId(null)
		setGeneratedLabel(null)
	}

	return (
		<>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<h2 className="text-lg font-semibold">#{order.orderNumber}</h2>
						<StatusBadge status={order.status} type="order" />
					</div>
					<div className="flex items-center gap-1.5 sm:hidden">
						<Button size="sm" variant="outline" onClick={() => router.push(`/orders/${order.id}/notes`)}>
							Notes
						</Button>
						{isCancellable && (
							<Button size="sm" variant="destructive" onClick={handleCancel} disabled={loading}>
								Cancel
							</Button>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<div className="flex gap-1.5 sm:gap-2 rounded-lg border p-2 sm:border-0 sm:p-0 w-full sm:w-auto">
						<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => setStatusDialog(true)}>
							Update Status
						</Button>
						{!order.trackingNumber && order.shippingAddress && (
							<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => { resetLabelDialog(); setLabelDialog(true) }}>
								Generate Label
							</Button>
						)}
						<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => setTrackingDialog(true)}>
							{order.trackingNumber ? "Update" : "Add"} Tracking
						</Button>
						<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => setRefundDialog(true)}>
							Refund
						</Button>
					</div>
					<Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => router.push(`/orders/${order.id}/notes`)}>
						Notes
					</Button>
					{isCancellable && (
						<Button size="sm" variant="destructive" className="hidden sm:inline-flex" onClick={handleCancel} disabled={loading}>
							Cancel
						</Button>
					)}
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-3 grid-cols-2 md:grid-cols-4">
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Total</p>
					<p className="text-xl font-semibold">{formatCurrency(order.total)}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Items</p>
					<p className="text-xl font-semibold">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Payment</p>
					<p className="text-sm font-medium mt-0.5">{order.payment?.status ?? "—"}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Placed</p>
					<p className="text-sm font-medium mt-0.5">{formatDate(order.createdAt)}</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3 flex-1 md:min-h-0 md:overflow-hidden">
				{/* Main content - 2 cols */}
				<div className="md:col-span-2 flex flex-col gap-6 md:min-h-0">
					{/* Line items */}
					<div className="rounded-lg border">
						<div className="px-4 py-3 border-b">
							<h3 className="text-sm font-medium">Items</h3>
						</div>
						<div className="divide-y">
							{order.items.map((item) => (
								<div key={item.id} className="flex items-center justify-between px-4 py-3">
									<div className="space-y-0.5">
										<span className="text-sm font-medium">{item.productName}</span>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span>{item.variantName}</span>
											<span>SKU: {item.sku}</span>
										</div>
									</div>
									<div className="text-right">
										<span className="text-sm">{formatCurrency(item.unitPrice)} x {item.quantity}</span>
										<p className="text-xs text-muted-foreground">{formatCurrency(item.totalPrice)}</p>
									</div>
								</div>
							))}
						</div>
						<div className="px-4 py-3 border-t space-y-1">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Subtotal</span>
								<span>{formatCurrency(order.subtotal)}</span>
							</div>
							{order.discountAmount && parseFloat(order.discountAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Discount</span>
									<span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
								</div>
							)}
							{order.taxAmount && parseFloat(order.taxAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Tax</span>
									<span>{formatCurrency(order.taxAmount)}</span>
								</div>
							)}
							{order.shippingAmount && parseFloat(order.shippingAmount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Shipping</span>
									<span>{formatCurrency(order.shippingAmount)}</span>
								</div>
							)}
							<div className="flex justify-between text-sm font-medium pt-1 border-t">
								<span>Total</span>
								<span>{formatCurrency(order.total)}</span>
							</div>
						</div>
					</div>

					{/* Tracking */}
					<div className="rounded-lg border px-4 py-3">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-medium">Tracking</h3>
							{order.trackingNumber && (
								<Button
									size="sm"
									variant="ghost"
									className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
									onClick={async () => {
										try {
											await removeTracking(order.id)
											toast.success("Tracking removed")
											router.refresh()
										} catch (e: any) {
											toast.error(e.message)
										}
									}}
								>
									Remove
								</Button>
							)}
						</div>
						{tracking ? (
							<TrackingTimeline
								trackingNumber={tracking.trackingNumber}
								carrierName={tracking.carrierName}
								status={tracking.status}
								statusHistory={tracking.statusHistory}
								estimatedDelivery={tracking.estimatedDelivery}
								lastUpdatedAt={tracking.lastUpdatedAt}
								trackingUrl={order.trackingUrl}
							/>
						) : order.trackingNumber ? (
							<>
								<p className="text-sm font-mono">{order.trackingNumber}</p>
								<p className="text-xs text-muted-foreground mt-1">
									Waiting for tracking updates...
								</p>
								{order.trackingUrl && (
									<a href={order.trackingUrl} target="_blank" rel="noopener" className="text-xs text-primary hover:underline mt-2 inline-block">
										Track shipment →
									</a>
								)}
							</>
						) : (
							<p className="text-xs text-muted-foreground">No tracking added</p>
						)}
					</div>

					{/* Activity */}
					<div className="rounded-lg border md:flex-1 flex flex-col md:min-h-0 md:overflow-hidden">
						<div className="px-4 py-3 border-b shrink-0 flex items-center justify-between">
							<h3 className="text-sm font-medium">Activity</h3>
							{activity.length > 0 && (
								<Button
									size="sm"
									variant="ghost"
									className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
									onClick={async () => {
										try {
											await clearOrderActivity(order.id)
											toast.success("Activity cleared")
											router.refresh()
										} catch (e: any) {
											toast.error(e.message)
										}
									}}
								>
									Clear
								</Button>
							)}
						</div>
						{activity.length === 0 ? (
							<div className="px-4 py-6 text-center">
								<p className="text-xs text-muted-foreground">No activity recorded</p>
							</div>
						) : (
							<div className="divide-y md:overflow-y-auto">
								{activity.map((entry) => (
									<div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
										<div className="flex items-center gap-2">
											<div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
											<span className="text-xs">{formatAction(entry.action, entry.metadata)}</span>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-[11px] text-muted-foreground hidden sm:inline">{entry.userName}</span>
											<span className="text-[11px] text-muted-foreground">{formatDate(entry.createdAt)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Sidebar - 1 col */}
				<div className="flex flex-col gap-6 md:min-h-0 md:overflow-auto">
					{/* Customer */}
					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Customer</h3>
						{order.customer ? (
							<div className="space-y-1">
								<p className="text-sm">{order.customer.name}</p>
								<p className="text-xs text-muted-foreground">{order.customer.email}</p>
								{order.customer.phone && (
									<p className="text-xs text-muted-foreground">{order.customer.phone}</p>
								)}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Unknown customer</p>
						)}
					</div>

					{/* Shipping address */}
					{order.shippingAddress && (
						<div className="rounded-lg border px-4 py-3">
							<h3 className="text-sm font-medium mb-2">Shipping Address</h3>
							<div className="text-xs text-muted-foreground space-y-0.5">
								<p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
								<p>{order.shippingAddress.addressLine1}</p>
								{order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
								<p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
								<p>{order.shippingAddress.country}</p>
							</div>
						</div>
					)}

					{/* Payment */}
					{order.payment && (
						<div className="rounded-lg border px-4 py-3">
							<h3 className="text-sm font-medium mb-2">Payment</h3>
							<div className="text-xs text-muted-foreground space-y-1">
								{order.payment.method && <p>Method: {order.payment.method}</p>}
								{order.payment.provider && <p>Provider: {order.payment.provider}</p>}
								{order.payment.status && <p>Status: {order.payment.status}</p>}
								{order.payment.txHash && (
									<p className="truncate">Tx: {order.payment.txHash}</p>
								)}
							</div>
						</div>
					)}

					{/* Status Timeline */}
					<div className="rounded-lg border px-4 py-3 flex-1 flex flex-col">
						<h3 className="text-sm font-medium mb-4">Order Progress</h3>
						<div className="space-y-0">
							{statusFlow.map((step, i) => {
								const currentIndex = statusFlow.indexOf(order.status)
								const isCompleted = i <= currentIndex
								const isCurrent = i === currentIndex
								const isLast = i === statusFlow.length - 1

								const stepDate = step === "pending" ? order.createdAt :
									step === "shipped" ? order.shippedAt :
									step === "delivered" ? order.deliveredAt : null

								return (
									<div key={step} className="flex gap-3">
										<div className="flex flex-col items-center">
											<div className="relative shrink-0 mt-0.5">
												{isCurrent && (
													<div className="absolute inset-0 w-3 h-3 rounded-full bg-primary/30 animate-ping" />
												)}
												<div className={`relative w-3 h-3 rounded-full ${
													isCurrent ? "bg-primary ring-4 ring-primary/10" :
													isCompleted ? "bg-primary" : "bg-muted"
												}`} />
											</div>
											{!isLast && (
												<div className={`w-px flex-1 min-h-[28px] ${
													isCompleted && i < currentIndex ? "bg-primary" : "bg-border"
												}`} />
											)}
										</div>
										<div className={`${isLast ? "pb-0" : "pb-4"}`}>
											<p className={`text-sm leading-none ${
												isCurrent ? "font-medium text-foreground" :
												isCompleted ? "text-foreground" : "text-muted-foreground"
											}`}>
												{step.charAt(0).toUpperCase() + step.slice(1)}
											</p>
											{isCompleted && stepDate && (
												<p className="text-[11px] text-muted-foreground mt-1">
													{formatDateTime(stepDate)}
												</p>
											)}
										</div>
									</div>
								)
							})}
						</div>

						{/* Verify with carrier */}
						{order.trackingUrl && (
							<div className="mt-auto pt-4">
								<a href={order.trackingUrl} target="_blank" rel="noopener">
									<Button size="sm" className="w-full">
										Verify with Carrier
									</Button>
								</a>
							</div>
						)}
					</div>

					{/* Customer notes */}
					{order.customerNotes && (
						<div className="rounded-lg border px-4 py-3">
							<h3 className="text-sm font-medium mb-2">Customer Notes</h3>
							<p className="text-xs text-muted-foreground">{order.customerNotes}</p>
						</div>
					)}
				</div>
			</div>

			{/* Status Update Dialog */}
			<Dialog open={statusDialog} onOpenChange={setStatusDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Order Status</DialogTitle>
					</DialogHeader>
					<div className="py-4 space-y-2">
						<Label>New Status</Label>
						<Select value={newStatus} onValueChange={setNewStatus}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{statusFlow.map((s) => (
									<SelectItem key={s} value={s}>
										{s.replace(/\b\w/g, (c) => c.toUpperCase())}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
						<Button onClick={handleStatusUpdate} disabled={loading}>
							{loading ? "Updating..." : "Update"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Tracking Dialog */}
			<Dialog open={trackingDialog} onOpenChange={(open) => {
				setTrackingDialog(open)
				if (!open) {
					setTrackingNumber("")
					setTrackingUrl("")
					setDetectedCarrier(null)
				}
			}}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Tracking</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Tracking Number</Label>
							<Input
								value={trackingNumber}
								onChange={(e) => handleTrackingNumberChange(e.target.value)}
								placeholder="Enter tracking number..."
							/>
							{detectedCarrier && (
								<div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
									<span>Detected: <strong>{detectedCarrier.name}</strong></span>
								</div>
							)}
							{trackingNumber.length >= 10 && !detectedCarrier && (
								<p className="text-xs text-muted-foreground">
									Carrier not detected. You can still add the tracking manually.
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label>
								Tracking URL
								{detectedCarrier && <span className="text-xs text-muted-foreground ml-2">(auto-generated)</span>}
							</Label>
							<Input
								value={trackingUrl}
								onChange={(e) => setTrackingUrl(e.target.value)}
								placeholder="https://..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setTrackingDialog(false)}>Cancel</Button>
						<Button onClick={handleAddTracking} disabled={loading || !trackingNumber.trim()}>
							{loading ? "Adding..." : "Add Tracking"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Refund Dialog */}
			<Dialog open={refundDialog} onOpenChange={setRefundDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Process Refund</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Amount ($)</Label>
							<Input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Reason</Label>
							<Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason for refund..." />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRefundDialog(false)}>Cancel</Button>
						<Button variant="destructive" onClick={handleRefund} disabled={loading}>
							{loading ? "Processing..." : "Process Refund"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Label Generation Dialog */}
			<Dialog open={labelDialog} onOpenChange={(open) => { setLabelDialog(open); if (!open) resetLabelDialog() }}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{labelStep === "dimensions" && "Package Dimensions"}
							{labelStep === "rates" && "Select Shipping Rate"}
							{labelStep === "success" && "Label Generated"}
						</DialogTitle>
					</DialogHeader>

					{labelStep === "dimensions" && (
						<div className="space-y-4 py-4">
							<div className="grid grid-cols-3 gap-3">
								<div className="space-y-2">
									<Label>Length</Label>
									<Input
										type="number"
										step="0.1"
										value={parcelLength}
										onChange={(e) => setParcelLength(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Width</Label>
									<Input
										type="number"
										step="0.1"
										value={parcelWidth}
										onChange={(e) => setParcelWidth(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Height</Label>
									<Input
										type="number"
										step="0.1"
										value={parcelHeight}
										onChange={(e) => setParcelHeight(e.target.value)}
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label>Unit</Label>
								<Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v as "in" | "cm")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="in">Inches (in)</SelectItem>
										<SelectItem value="cm">Centimeters (cm)</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label>Weight</Label>
									<Input
										type="number"
										step="0.1"
										value={parcelWeight}
										onChange={(e) => setParcelWeight(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Unit</Label>
									<Select value={massUnit} onValueChange={(v) => setMassUnit(v as "lb" | "kg" | "oz" | "g")}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="lb">Pounds (lb)</SelectItem>
											<SelectItem value="oz">Ounces (oz)</SelectItem>
											<SelectItem value="kg">Kilograms (kg)</SelectItem>
											<SelectItem value="g">Grams (g)</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								Ship to: {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}, {order.shippingAddress?.country}
							</p>
						</div>
					)}

					{labelStep === "rates" && (
						<div className="space-y-4 py-4">
							{shippingRates.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No shipping rates available for this route.
								</p>
							) : (
								<div className="space-y-2 max-h-[300px] overflow-y-auto">
									{shippingRates.map((rate) => (
										<div
											key={rate.object_id}
											className={`p-3 rounded-lg border cursor-pointer transition-colors ${
												selectedRateId === rate.object_id
													? "border-primary bg-primary/5"
													: "hover:border-muted-foreground/30"
											}`}
											onClick={() => setSelectedRateId(rate.object_id)}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<input
														type="radio"
														checked={selectedRateId === rate.object_id}
														onChange={() => setSelectedRateId(rate.object_id)}
														className="h-4 w-4"
													/>
													<div>
														<p className="text-sm font-medium">
															{rate.provider} - {rate.servicelevel.name}
														</p>
														<p className="text-xs text-muted-foreground">
															{rate.estimated_days === 1 ? "1 day" : `${rate.estimated_days} days`}
															{rate.duration_terms && ` • ${rate.duration_terms}`}
														</p>
													</div>
												</div>
												<p className="text-sm font-semibold">
													${parseFloat(rate.amount).toFixed(2)}
												</p>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{labelStep === "success" && generatedLabel && (
						<div className="space-y-4 py-4">
							<div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
								<div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
									<span className="font-medium">Label Created Successfully</span>
								</div>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Carrier:</span>
										<span className="font-medium">{generatedLabel.carrier}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Service:</span>
										<span className="font-medium">{generatedLabel.service}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Cost:</span>
										<span className="font-medium">${parseFloat(generatedLabel.cost).toFixed(2)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Tracking:</span>
										<span className="font-mono text-xs">{generatedLabel.trackingNumber}</span>
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button className="flex-1" onClick={handlePrintLabel}>
									<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
									Print Label
								</Button>
								<Button variant="outline" asChild>
									<a href={generatedLabel.labelUrl} target="_blank" rel="noopener noreferrer">
										Download PDF
									</a>
								</Button>
							</div>
						</div>
					)}

					<DialogFooter>
						{labelStep === "dimensions" && (
							<>
								<Button variant="outline" onClick={() => setLabelDialog(false)}>Cancel</Button>
								<Button onClick={handleGetRates} disabled={fetchingRates}>
									{fetchingRates ? "Getting Rates..." : "Get Shipping Rates"}
								</Button>
							</>
						)}
						{labelStep === "rates" && (
							<>
								<Button variant="outline" onClick={() => setLabelStep("dimensions")}>Back</Button>
								<Button onClick={handlePurchaseLabel} disabled={purchasingLabel || !selectedRateId}>
									{purchasingLabel ? "Purchasing..." : "Purchase Label"}
								</Button>
							</>
						)}
						{labelStep === "success" && (
							<Button onClick={() => setLabelDialog(false)}>Done</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
