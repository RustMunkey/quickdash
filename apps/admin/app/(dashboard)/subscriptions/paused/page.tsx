import { Suspense } from "react"
import { getSubscriptions } from "../actions"
import { SubscriptionsTable } from "../subscriptions-table"
import { subscriptionsParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PausedSubscriptionsPage({ searchParams }: PageProps) {
	const { page } = await subscriptionsParamsCache.parse(searchParams)

	const { items, totalCount } = await getSubscriptions({ page, pageSize: 25, status: "paused" })

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<SubscriptionsTable
					subscriptions={items}
					totalCount={totalCount}
					currentStatus="paused"
					description="Subscriptions that have been temporarily paused by customers."
				/>
			</Suspense>
		</div>
	)
}
