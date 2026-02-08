import { Suspense } from "react"
import { getInventory } from "./actions"
import { InventoryTable } from "./inventory-table"
import { inventoryParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryPage({ searchParams }: PageProps) {
	const { page, search, stock } = await inventoryParamsCache.parse(searchParams)
	// Map nuqs stock filter values to the getInventory filter param
	const filter = stock === "all" ? undefined : stock === "low_stock" ? "low" : stock === "out_of_stock" ? "out" : undefined
	const { items, totalCount } = await getInventory({
		page,
		pageSize: 25,
		search: search || undefined,
		filter,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Monitor and adjust inventory across all products.
			</p>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<InventoryTable
					items={items}
					totalCount={totalCount}
				/>
			</Suspense>
		</div>
	)
}
