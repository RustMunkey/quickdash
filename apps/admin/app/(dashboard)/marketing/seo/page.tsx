import { getProductsSeo } from "../actions"
import { SeoClient } from "./seo-client"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function SeoPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const { items, totalCount } = await getProductsSeo({ page, pageSize })

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<SeoClient products={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
