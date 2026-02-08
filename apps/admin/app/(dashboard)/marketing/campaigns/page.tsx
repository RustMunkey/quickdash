import { getCampaigns } from "../actions"
import { CampaignsTable } from "./campaigns-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function CampaignsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getCampaigns({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Create and manage marketing campaigns to engage customers.
			</p>
			<CampaignsTable campaigns={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
