import { getSuppliers } from "./actions"
import { SuppliersTable } from "./suppliers-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function SuppliersPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getSuppliers({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage your product suppliers and vendors.
			</p>
			<SuppliersTable suppliers={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
