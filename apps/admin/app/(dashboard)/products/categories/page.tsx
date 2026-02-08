import { getAllCategories } from "./actions"
import { CategoriesClient } from "./categories-client"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const { items, totalCount } = await getAllCategories({ page, pageSize })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<CategoriesClient categories={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
