import { getOrdersByStatus } from "../actions"
import { FulfillmentClient } from "./fulfillment-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function FulfillmentPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getOrdersByStatus({
		statuses: ["confirmed", "processing", "packed"],
		page,
		pageSize: 25,
	})

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Orders ready to be packed and shipped.
			</p>

			<FulfillmentClient orders={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
