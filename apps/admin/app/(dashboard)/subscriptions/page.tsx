import { Suspense } from "react"
import { getSubscriptions } from "./actions"
import { SubscriptionsTable } from "./subscriptions-table"
import { subscriptionsParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
	const { page, status } = await subscriptionsParamsCache.parse(searchParams)

	const { items, totalCount } = await getSubscriptions({
		page,
		pageSize: 25,
		status: status === "all" ? undefined : status,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<SubscriptionsTable
					subscriptions={items}
					totalCount={totalCount}
					description="Manage recurring delivery subscriptions."
				/>
			</Suspense>
		</div>
	)
}
