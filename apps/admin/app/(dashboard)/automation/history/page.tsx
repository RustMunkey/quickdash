import { Suspense } from "react"
import { getWorkflowRuns } from "../actions"
import { RunsTable } from "./runs-table"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function HistoryPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const { items, totalCount } = await getWorkflowRuns({ page, pageSize })

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div>
				<p className="text-sm text-muted-foreground">
					View the execution history of all your workflows.
				</p>
			</div>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<RunsTable runs={items} totalCount={totalCount} currentPage={page} />
			</Suspense>
		</div>
	)
}
