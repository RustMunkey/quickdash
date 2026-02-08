import { getCarriers } from "./actions"
import { CarriersTable } from "./carriers-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function ShippingPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getCarriers({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Configure shipping carriers and their delivery rates.
			</p>
			<CarriersTable carriers={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
