import { getSitePages } from "../actions"
import { PagesTable } from "./pages-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function SitePagesPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getSitePages({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Manage static pages like About, Contact, FAQ.</p>
			<PagesTable pages={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
