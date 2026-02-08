import { getGiftCards } from "./actions"
import { GiftCardsClient } from "./gift-cards-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function GiftCardsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getGiftCards({ page, pageSize: 25 })

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Create and manage gift cards for customers.
			</p>
			<GiftCardsClient cards={items} totalCount={totalCount} currentPage={page} />
		</div>
	)
}
