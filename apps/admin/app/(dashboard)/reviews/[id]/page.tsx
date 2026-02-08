import { notFound } from "next/navigation"
import { getReview } from "../actions"
import { ReviewDetail } from "./review-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function ReviewDetailPage({ params }: PageProps) {
	const { id } = await params

	let review
	try {
		review = await getReview(id)
	} catch {
		notFound()
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<ReviewDetail review={review} />
		</div>
	)
}
