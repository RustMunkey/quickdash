import { Suspense } from "react"
import { getContacts } from "./actions"
import { ContactsTable } from "./contacts-table"

export default async function ContactsPage() {
	const { items, totalCount } = await getContacts()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage leads, prospects, and customer relationships.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<ContactsTable contacts={items} totalCount={totalCount} />
			</Suspense>
		</div>
	)
}
