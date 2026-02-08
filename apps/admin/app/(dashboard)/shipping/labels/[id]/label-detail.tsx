"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateLabelStatus } from "../../actions"

interface LabelDetailProps {
	label: {
		id: string
		orderId: string
		carrierId: string
		trackingNumber: string
		labelUrl: string | null
		status: string
		weight: string | null
		dimensions: { length: number; width: number; height: number } | null
		cost: string | null
		createdAt: Date
		carrierName: string
		orderNumber: string
	}
}

const statuses = ["pending", "printed", "shipped", "delivered"]

export function LabelDetail({ label }: LabelDetailProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(label.id, `#${label.orderNumber}`)

	const handleStatusChange = async (status: string) => {
		setLoading(true)
		try {
			await updateLabelStatus(label.id, status)
			toast.success(`Status updated to ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update status")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">Label for #{label.orderNumber}</h2>
					<StatusBadge status={label.status} type="label" />
				</div>
				<div className="flex items-center gap-2">
					<Select value={label.status} onValueChange={handleStatusChange} disabled={loading}>
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
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Shipment Info</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Tracking Number</span>
								<span className="font-mono">{label.trackingNumber}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Carrier</span>
								<span>{label.carrierName}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Order</span>
								<Button
									variant="link"
									size="sm"
									className="h-auto p-0 text-sm"
									onClick={() => router.push(`/orders/${label.orderId}`)}
								>
									#{label.orderNumber}
								</Button>
							</div>
							{label.cost && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Cost</span>
									<span>{formatCurrency(label.cost)}</span>
								</div>
							)}
						</div>
					</div>

					{label.labelUrl && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Label</h3>
							<a
								href={label.labelUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
							>
								{label.labelUrl}
							</a>
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Package</h3>
						<div className="space-y-2 text-sm">
							{label.weight && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Weight</span>
									<span>{label.weight} kg</span>
								</div>
							)}
							{label.dimensions && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Dimensions</span>
									<span>{label.dimensions.length} x {label.dimensions.width} x {label.dimensions.height} cm</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span>{formatDate(label.createdAt)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
