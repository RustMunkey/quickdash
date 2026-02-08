import { Suspense } from "react"
import { getProducts, getCategories } from "./actions"
import { ProductsTable } from "./products-table"
import { productsParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsPage({ searchParams }: PageProps) {
	const { page, search, category, status } = await productsParamsCache.parse(searchParams)
	const { items, totalCount } = await getProducts({
		page,
		pageSize: 25,
		search: search || undefined,
		category: category === "all" ? undefined : category,
		status: status === "all" ? undefined : status,
	})
	const allCategories = await getCategories()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<ProductsTable
					products={items}
					categories={allCategories}
					totalCount={totalCount}
				/>
			</Suspense>
		</div>
	)
}
