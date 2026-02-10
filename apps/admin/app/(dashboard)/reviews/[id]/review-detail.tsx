"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { moderateReview, deleteReview, toggleFeatured } from "../actions"

interface ReviewDetailProps {
	review: {
		id: string
		reviewerName: string
		reviewerEmail: string | null
		rating: number
		title: string | null
		content: string
		status: string
		isFeatured: boolean
		createdAt: Date
		updatedAt: Date
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
	useBreadcrumbOverride(review.id, review.reviewerName)

	const handleModerate = async (status: "approved" | "rejected") => {
		try {
			await moderateReview(review.id, status)
			toast.success(`Review ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleToggleFeatured = async () => {
		try {
			await toggleFeatured(review.id, !review.isFeatured)
			toast.success(review.isFeatured ? "Removed from featured" : "Added to featured")
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
					{review.isFeatured && (
						<span className="text-amber-500 text-xs font-medium">★ Featured</span>
					)}
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
					<Button size="sm" variant="outline" onClick={handleToggleFeatured}>
						{review.isFeatured ? "Unfeature" : "Feature"}
					</Button>
					<Button size="sm" variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{/* Main content */}
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border px-4 py-4 space-y-3">
						<Stars rating={review.rating} />
						{review.title && (
							<h3 className="font-medium">{review.title}</h3>
						)}
						{review.content ? (
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">
								{review.content}
							</p>
						) : (
							<p className="text-sm text-muted-foreground italic">No review text</p>
						)}
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Reviewer</h3>
						<p className="text-sm">{review.reviewerName}</p>
						{review.reviewerEmail && (
							<p className="text-xs text-muted-foreground">{review.reviewerEmail}</p>
						)}
					</div>

					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Details</h3>
						<div className="text-xs text-muted-foreground space-y-1">
							<p>Submitted: {formatDateTime(review.createdAt)}</p>
							<p>Updated: {formatDateTime(review.updatedAt)}</p>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
