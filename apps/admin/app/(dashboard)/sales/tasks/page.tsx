import { Suspense } from "react"
import { getTasks } from "./actions"
import { TasksTable } from "./tasks-table"

export default async function TasksPage() {
	const { items, totalCount } = await getTasks()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Follow-ups, reminders, and to-dos for your team.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<TasksTable tasks={items} totalCount={totalCount} />
			</Suspense>
		</div>
	)
}
