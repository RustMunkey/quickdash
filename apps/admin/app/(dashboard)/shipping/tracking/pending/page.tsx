import { getPendingTracking } from "../../actions"
import { PendingTrackingClient } from "./pending-client"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function PendingTrackingPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1

	const { items, totalCount } = await getPendingTracking({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Review and approve tracking numbers before they are associated with orders.
			</p>
			<PendingTrackingClient
				items={items}
				totalCount={totalCount}
				currentPage={page}
			/>
		</div>
	)
}
