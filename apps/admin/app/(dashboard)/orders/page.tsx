import { Suspense } from "react"
import { getOrders } from "./actions"
import { OrdersTable } from "./orders-table"
import { ordersParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrdersPage({ searchParams }: PageProps) {
	const { page, status, search } = await ordersParamsCache.parse(searchParams)
	const { items, totalCount } = await getOrders({
		page,
		pageSize: 25,
		status: status === "all" ? undefined : status,
		search: search || undefined,
	})

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				View and manage customer orders.
			</p>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<OrdersTable
					orders={items}
					totalCount={totalCount}
				/>
			</Suspense>
		</div>
	)
}
