import { getTracking } from "../actions"
import { TrackingClient } from "./tracking-client"

interface PageProps {
	searchParams: Promise<{ page?: string; status?: string }>
}

export default async function TrackingPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1

	const { items, totalCount } = await getTracking({
		page,
		pageSize: 25,
		status: params.status,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<TrackingClient
				items={items}
				totalCount={totalCount}
				currentPage={page}
				currentStatus={params.status}
			/>
		</div>
	)
}
