import { getSegments } from "./actions"
import { SegmentsClient } from "./segments-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function SegmentsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getSegments({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Organize customers into groups for targeted marketing.
			</p>
			<SegmentsClient segments={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
