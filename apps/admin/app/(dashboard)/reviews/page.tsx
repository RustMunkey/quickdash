import { Suspense } from "react"
import { getReviews } from "./actions"
import { ReviewsTable } from "./reviews-table"
import { reviewsParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewsPage({ searchParams }: PageProps) {
	const { page, status } = await reviewsParamsCache.parse(searchParams)
	const { items, totalCount } = await getReviews({
		page,
		pageSize: 25,
		status: status === "all" ? undefined : status,
	})

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage customer reviews and testimonials.
			</p>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<ReviewsTable
					reviews={items}
					totalCount={totalCount}
				/>
			</Suspense>
		</div>
	)
}
