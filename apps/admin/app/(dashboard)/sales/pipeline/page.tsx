import { Suspense } from "react"
import { getPipelineData } from "./actions"
import { PipelineBoard } from "./pipeline-board"

export default async function PipelinePage() {
	const { stages, deals } = await getPipelineData()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Visual kanban board of your sales pipeline.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<PipelineBoard stages={stages} deals={deals} />
			</Suspense>
		</div>
	)
}
