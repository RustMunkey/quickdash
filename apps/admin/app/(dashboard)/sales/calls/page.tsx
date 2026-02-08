import { Suspense } from "react"
import { getCalls } from "./actions"
import { CallsTable } from "./calls-table"

export default async function CallsPage() {
	const { items, totalCount } = await getCalls()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Business phone line and call history.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<CallsTable calls={items} totalCount={totalCount} />
			</Suspense>
		</div>
	)
}
