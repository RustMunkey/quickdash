import { Suspense } from "react"
import { getCompanies } from "../contacts/actions"
import { CompaniesTable } from "./companies-table"

export default async function CompaniesPage() {
	const { items, totalCount } = await getCompanies()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Track organizations and B2B accounts.
			</p>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<CompaniesTable companies={items} totalCount={totalCount} />
			</Suspense>
		</div>
	)
}
