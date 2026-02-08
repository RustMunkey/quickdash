import { getOrdersByStatus } from "../actions"
import { ReturnsClient } from "./returns-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function ReturnsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getOrdersByStatus({
		statuses: ["refunded", "partially_refunded", "returned"],
		page,
		pageSize: 25,
	})

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Orders with refunds or returns.
			</p>

			<ReturnsClient orders={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
