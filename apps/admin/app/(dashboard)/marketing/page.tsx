import { Suspense } from "react"
import { getDiscounts } from "./actions"
import { DiscountsTable } from "./discounts-table"
import { discountsParamsCache } from "@/lib/search-params"

interface PageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MarketingPage({ searchParams }: PageProps) {
	const { page } = await discountsParamsCache.parse(searchParams)
	const { items, totalCount } = await getDiscounts({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Create and manage discount codes and promotions.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<DiscountsTable discounts={items} totalCount={totalCount} />
			</Suspense>
		</div>
	)
}
