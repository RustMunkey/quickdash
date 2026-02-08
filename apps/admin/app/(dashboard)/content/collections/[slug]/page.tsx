import { notFound } from "next/navigation"
import { getCollection, getEntries } from "../actions"
import { EntriesTable } from "./entries-table"

interface PageProps {
	params: Promise<{ slug: string }>
	searchParams: Promise<{ page?: string; search?: string }>
}

export default async function CollectionEntriesPage({ params, searchParams }: PageProps) {
	const { slug } = await params
	const { page, search } = await searchParams

	const collection = await getCollection(slug)
	if (!collection) {
		notFound()
	}

	const { items, totalCount } = await getEntries(collection.id, {
		page: page ? parseInt(page) : 1,
		pageSize: 25,
		search,
	})

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				{collection.description || `Manage entries in the ${collection.name} collection.`}
			</p>
			<EntriesTable
				collection={collection}
				entries={items}
				totalCount={totalCount}
				currentPage={page ? parseInt(page) : 1}
			/>
		</div>
	)
}
