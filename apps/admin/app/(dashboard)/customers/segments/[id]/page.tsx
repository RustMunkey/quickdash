import { notFound } from "next/navigation"
import { getSegment } from "../actions"
import { SegmentDetail } from "./segment-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function SegmentDetailPage({ params }: PageProps) {
	const { id } = await params

	let segment
	try {
		segment = await getSegment(id)
	} catch {
		notFound()
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<SegmentDetail segment={segment} />
		</div>
	)
}
