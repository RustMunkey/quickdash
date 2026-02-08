"use client"

import { formatDateTime, formatDate } from "@/lib/format"
import { StatusBadge } from "@/components/status-badge"

interface TrackingEvent {
	status: string
	timestamp: string
	location?: string
}

interface TrackingTimelineProps {
	trackingNumber: string
	carrierName: string
	status: string
	statusHistory: TrackingEvent[]
	estimatedDelivery?: Date | null
	lastUpdatedAt: Date
	trackingUrl?: string | null
}

const STATUS_LABELS: Record<string, string> = {
	pending: "Pending",
	pre_transit: "Label Created",
	in_transit: "In Transit",
	out_for_delivery: "Out for Delivery",
	delivered: "Delivered",
	exception: "Exception",
	returned: "Returned",
	unknown: "Unknown",
}

export function TrackingTimeline({
	trackingNumber,
	carrierName,
	status,
	statusHistory,
	estimatedDelivery,
	lastUpdatedAt,
	trackingUrl,
}: TrackingTimelineProps) {
	// Sort history by timestamp descending (most recent first)
	const sortedHistory = [...statusHistory].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">{carrierName}</p>
					<p className="text-xs text-muted-foreground font-mono">{trackingNumber}</p>
				</div>
				<StatusBadge status={status} type="tracking" />
			</div>

			{/* Estimated Delivery */}
			{estimatedDelivery && status !== "delivered" && (
				<div className="rounded-lg bg-muted/50 px-3 py-2">
					<p className="text-xs text-muted-foreground">Estimated Delivery</p>
					<p className="text-sm font-medium">{formatDate(estimatedDelivery)}</p>
				</div>
			)}

			{/* Timeline */}
			{sortedHistory.length > 0 ? (
				<div className="relative">
					<div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
					<div className="space-y-0">
						{sortedHistory.map((event, index) => {
							const isLatest = index === 0
							const isDelivered = event.status === "delivered"

							return (
								<div key={`${event.status}-${event.timestamp}`} className="relative flex gap-3 pb-4">
									<div className="relative z-10 mt-1.5 shrink-0">
										<div
											className={`w-3.5 h-3.5 rounded-full border-2 ${
												isLatest
													? isDelivered
														? "bg-green-500 border-green-500"
														: "bg-primary border-primary"
													: "bg-background border-muted-foreground/30"
											}`}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<p className={`text-sm ${isLatest ? "font-medium" : "text-muted-foreground"}`}>
											{STATUS_LABELS[event.status] || event.status}
										</p>
										{event.location && (
											<p className="text-xs text-muted-foreground mt-0.5">{event.location}</p>
										)}
										<p className="text-[11px] text-muted-foreground mt-0.5">
											{formatDateTime(new Date(event.timestamp))}
										</p>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			) : (
				<p className="text-xs text-muted-foreground">No tracking updates yet</p>
			)}

			{/* Last Updated */}
			<p className="text-[11px] text-muted-foreground">
				Last updated: {formatDateTime(lastUpdatedAt)}
			</p>

			{/* Track with Carrier */}
			{trackingUrl && (
				<a
					href={trackingUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
				>
					Track on {carrierName}
					<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/>
					</svg>
				</a>
			)}
		</div>
	)
}
