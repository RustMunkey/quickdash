import { getPurchaseOrders } from "../actions"
import { POTable } from "./po-table"

interface PageProps {
	searchParams: Promise<{ page?: string; status?: string }>
}

export default async function PurchaseOrdersPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1

	const { items, totalCount } = await getPurchaseOrders({
		page,
		pageSize: 25,
		status: params.status,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Orders placed with suppliers for restocking.</p>
			<POTable
				orders={items}
				totalCount={totalCount}
				currentPage={page}
				currentStatus={params.status}
			/>
		</div>
	)
}
