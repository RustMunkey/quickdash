"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateSubscriptionStatus, cancelSubscription, resumeSubscription, updateFrequency } from "../actions"

interface SubscriptionDetailProps {
	subscription: {
		id: string
		userId: string
		status: string
		frequency: string
		pricePerDelivery: string
		nextDeliveryAt: Date | null
		lastDeliveryAt: Date | null
		totalDeliveries: number | null
		cancelledAt: Date | null
		cancellationReason: string | null
		createdAt: Date
		updatedAt: Date
		customerName: string | null
		customerEmail: string | null
		items: Array<{
			id: string
			quantity: number
			variantId: string
			variantName: string
			variantSku: string
			productName: string
			productPrice: string
			variantPrice: string | null
		}>
	}
}

const frequencies = ["weekly", "biweekly", "monthly", "every_2_months", "quarterly"]

export function SubscriptionDetail({ subscription }: SubscriptionDetailProps) {
	const router = useRouter()
	const [cancelOpen, setCancelOpen] = useState(false)
	const [cancelReason, setCancelReason] = useState("")
	const [frequencyOpen, setFrequencyOpen] = useState(false)
	const [newFrequency, setNewFrequency] = useState(subscription.frequency)
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(subscription.id, subscription.customerName || subscription.id.slice(0, 8))

	const handlePause = async () => {
		setLoading(true)
		try {
			await updateSubscriptionStatus(subscription.id, "paused")
			toast.success("Subscription paused")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to pause")
		} finally {
			setLoading(false)
		}
	}

	const handleResume = async () => {
		setLoading(true)
		try {
			await resumeSubscription(subscription.id)
			toast.success("Subscription resumed")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to resume")
		} finally {
			setLoading(false)
		}
	}

	const handleCancel = async () => {
		setLoading(true)
		try {
			await cancelSubscription(subscription.id, cancelReason)
			toast.success("Subscription cancelled")
			setCancelOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to cancel")
		} finally {
			setLoading(false)
		}
	}

	const handleFrequencyChange = async () => {
		setLoading(true)
		try {
			await updateFrequency(subscription.id, newFrequency)
			toast.success("Frequency updated")
			setFrequencyOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update frequency")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">
						{subscription.customerName || "Subscription"}
					</h2>
					<StatusBadge status={subscription.status} type="subscription" />
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					{subscription.status === "active" && (
						<>
							<Button variant="outline" size="sm" onClick={handlePause} disabled={loading}>
								Pause
							</Button>
							<Button variant="outline" size="sm" onClick={() => setFrequencyOpen(true)} disabled={loading}>
								Change Frequency
							</Button>
							<Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={loading}>
								Cancel
							</Button>
						</>
					)}
					{subscription.status === "paused" && (
						<>
							<Button variant="default" size="sm" onClick={handleResume} disabled={loading}>
								Resume
							</Button>
							<Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={loading}>
								Cancel
							</Button>
						</>
					)}
					{subscription.status === "dunning" && (
						<>
							<Button variant="outline" size="sm" onClick={handlePause} disabled={loading}>
								Pause
							</Button>
							<Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={loading}>
								Cancel
							</Button>
						</>
					)}
					{subscription.status === "cancelled" && (
						<Button variant="default" size="sm" onClick={handleResume} disabled={loading}>
							Reactivate
						</Button>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4 sm:space-y-6">
					{/* Subscription Items */}
					<div className="rounded-lg border p-4">
						<h3 className="text-sm font-medium mb-3">Items</h3>
						<div className="space-y-3">
							{subscription.items.map((item) => (
								<div key={item.id} className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">{item.productName}</p>
										<p className="text-xs text-muted-foreground">
											{item.variantName} &middot; SKU: {item.variantSku}
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm">
											{formatCurrency(item.variantPrice ?? item.productPrice)} &times; {item.quantity}
										</p>
									</div>
								</div>
							))}
						</div>
						<div className="border-t mt-3 pt-3 flex justify-between">
							<span className="text-sm font-medium">Per Delivery</span>
							<span className="text-sm font-medium">
								{formatCurrency(subscription.pricePerDelivery)}
							</span>
						</div>
					</div>

					{/* Cancellation Info */}
					{subscription.status === "cancelled" && subscription.cancelledAt && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Cancellation</h3>
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">
									Cancelled on {formatDate(subscription.cancelledAt)}
								</p>
								{subscription.cancellationReason && (
									<p className="text-sm">
										<span className="text-muted-foreground">Reason:</span>{" "}
										{subscription.cancellationReason}
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Sidebar info */}
				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Frequency</span>
								<span className="capitalize">{subscription.frequency.replace(/_/g, " ")}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Total Deliveries</span>
								<span>{subscription.totalDeliveries ?? 0}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Next Delivery</span>
								<span>{subscription.nextDeliveryAt ? formatDate(subscription.nextDeliveryAt) : "—"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Last Delivery</span>
								<span>{subscription.lastDeliveryAt ? formatDate(subscription.lastDeliveryAt) : "—"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Started</span>
								<span>{formatDate(subscription.createdAt)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span>{formatDate(subscription.updatedAt)}</span>
							</div>
						</div>
					</div>

					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Customer</h3>
						<div className="space-y-1 text-sm">
							<p>{subscription.customerName ?? "—"}</p>
							<p className="text-muted-foreground">{subscription.customerEmail ?? "—"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Cancel Dialog */}
			<Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Subscription</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Label>Reason (optional)</Label>
						<Textarea
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							placeholder="Why is this subscription being cancelled?"
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCancelOpen(false)}>
							Keep Active
						</Button>
						<Button variant="destructive" onClick={handleCancel} disabled={loading}>
							Cancel Subscription
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Frequency Dialog */}
			<Dialog open={frequencyOpen} onOpenChange={setFrequencyOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Frequency</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Label>New Frequency</Label>
						<Select value={newFrequency} onValueChange={setNewFrequency}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{frequencies.map((f) => (
									<SelectItem key={f} value={f}>
										{f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFrequencyOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleFrequencyChange} disabled={loading || newFrequency === subscription.frequency}>
							Update
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
