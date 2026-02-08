import { getDeveloperNotes, getAllUsers } from "./actions"
import { NotesTable } from "./notes-table"

interface PageProps {
	searchParams: Promise<{ page?: string }>
}

export default async function DeveloperNotesPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25

	const [{ items, totalCount }, allUsers] = await Promise.all([
		getDeveloperNotes({ page, pageSize }),
		getAllUsers(),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Track bugs, issues, and notes.</p>
			<NotesTable notes={items} users={allUsers} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
