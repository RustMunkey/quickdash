import { Suspense } from "react"
import Link from "next/link"
import { getActiveAuctions } from "./actions"
import { AuctionsTable } from "./auctions-table"
import { Button } from "@/components/ui/button"

export default async function AuctionsPage() {
	const { items, totalCount } = await getActiveAuctions()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Live auctions currently accepting bids.
				</p>
				<Link href="/auctions/new" className="sm:hidden">
					<Button size="sm">Create Auction</Button>
				</Link>
			</div>
			<Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded-lg" />}>
				<AuctionsTable auctions={items} totalCount={totalCount} view="active" />
			</Suspense>
		</div>
	)
}
