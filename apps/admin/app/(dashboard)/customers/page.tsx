import { Suspense } from "react"
import { getCustomers } from "./actions"
import { CustomersTable } from "./customers-table"
import { customersParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CustomersPage({ searchParams }: PageProps) {
	const { page, search } = await customersParamsCache.parse(searchParams)
	const { items, totalCount } = await getCustomers({
		page,
		pageSize: 25,
		search: search || undefined,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				View and manage your customer base.
			</p>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<CustomersTable
					customers={items}
					totalCount={totalCount}
				/>
			</Suspense>
		</div>
	)
}
