import { Suspense } from "react"
import { getWorkflows } from "./actions"
import { WorkflowsTable } from "./workflows-table"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function AutomationPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const { items, totalCount } = await getWorkflows({ page, pageSize })

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div>
				<p className="text-sm text-muted-foreground">
					Create automated workflows to streamline your business processes.
				</p>
			</div>

			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<WorkflowsTable workflows={items} totalCount={totalCount} currentPage={page} />
			</Suspense>
		</div>
	)
}
