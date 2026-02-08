import Link from "next/link"
import { getCollections } from "./actions"
import { CollectionsTable } from "./collections-table"

export default async function CollectionsPage() {
	const collections = await getCollections()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">Manage your content collections. Each collection has its own schema, entries, and storefront API endpoint.</p>
			</div>
			<CollectionsTable collections={collections} />
		</div>
	)
}
