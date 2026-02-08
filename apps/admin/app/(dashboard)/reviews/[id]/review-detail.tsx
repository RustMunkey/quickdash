"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { moderateReview, deleteReview } from "../actions"

interface ReviewDetailProps {
	review: {
		id: string
		rating: number
		title: string | null
		body: string | null
		status: string
		isVerifiedPurchase: boolean | null
		helpfulCount: number | null
		reportCount: number | null
		moderatedAt: Date | null
		createdAt: Date
		productName: string | null
		productId: string
		customerName: string | null
		customerEmail: string | null
	}
}

function Stars({ rating }: { rating: number }) {
	return (
		<span className="text-amber-500 text-lg">
			{"★".repeat(rating)}{"☆".repeat(5 - rating)}
		</span>
	)
}

export function ReviewDetail({ review }: ReviewDetailProps) {
	const router = useRouter()
	useBreadcrumbOverride(review.id, review.productName ?? "Review")

	const handleModerate = async (status: "approved" | "rejected" | "reported") => {
		try {
			await moderateReview(review.id, status)
			toast.success(`Review ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleDelete = async () => {
		try {
			await deleteReview(review.id)
			toast.success("Review deleted")
			router.push("/reviews")
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	return (
		<>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">Review</h2>
					<StatusBadge status={review.status} type="review" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{review.status !== "approved" && (
						<Button size="sm" variant="outline" onClick={() => handleModerate("approved")}>
							Approve
						</Button>
					)}
					{review.status !== "rejected" && (
						<Button size="sm" variant="outline" onClick={() => handleModerate("rejected")}>
							Reject
						</Button>
					)}
					{review.status !== "reported" && (
						<Button size="sm" variant="outline" onClick={() => handleModerate("reported")}>
							Flag
						</Button>
					)}
					<Button size="sm" variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{/* Main content */}
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border px-4 py-4 space-y-3">
						<div className="flex items-center gap-3">
							<Stars rating={review.rating} />
							{review.isVerifiedPurchase && (
								<Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
									Verified Purchase
								</Badge>
							)}
						</div>
						{review.title && (
							<h3 className="font-medium">{review.title}</h3>
						)}
						{review.body ? (
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">
								{review.body}
							</p>
						) : (
							<p className="text-sm text-muted-foreground italic">No review text</p>
						)}
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Product</h3>
						<p className="text-sm">{review.productName ?? "Unknown"}</p>
					</div>

					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Customer</h3>
						<p className="text-sm">{review.customerName ?? "Unknown"}</p>
						{review.customerEmail && (
							<p className="text-xs text-muted-foreground">{review.customerEmail}</p>
						)}
					</div>

					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Stats</h3>
						<div className="text-xs text-muted-foreground space-y-1">
							<p>Helpful votes: {review.helpfulCount ?? 0}</p>
							<p>Reports: {review.reportCount ?? 0}</p>
							<p>Submitted: {formatDateTime(review.createdAt)}</p>
							{review.moderatedAt && (
								<p>Moderated: {formatDateTime(review.moderatedAt)}</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
