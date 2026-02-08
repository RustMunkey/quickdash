import { getLabels } from "../actions"
import { LabelsClient } from "./labels-client"

interface PageProps {
	searchParams: Promise<{ page?: string; status?: string }>
}

export default async function LabelsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1

	const { items, totalCount } = await getLabels({
		page,
		pageSize: 25,
		status: params.status,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<LabelsClient
				labels={items}
				totalCount={totalCount}
				currentPage={page}
				currentStatus={params.status}
			/>
		</div>
	)
}
