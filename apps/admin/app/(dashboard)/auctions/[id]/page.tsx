import { notFound } from "next/navigation"
import { getAuction, getBidHistory, getProductsForAuction } from "../actions"
import { AuctionForm } from "./auction-form"
import { AuctionDetail } from "./auction-detail"

interface PageProps {
	params: Promise<{ id: string }>
	searchParams: Promise<{ edit?: string }>
}

export default async function AuctionPage({ params, searchParams }: PageProps) {
	const { id } = await params
	const { edit } = await searchParams

	// New auction
	if (id === "new") {
		const products = await getProductsForAuction()
		return (
			<div className="flex flex-1 flex-col p-4 pt-0">
				<AuctionForm products={products} />
			</div>
		)
	}

	// Existing auction
	let auction
	try {
		auction = await getAuction(id)
	} catch {
		notFound()
	}

	const products = await getProductsForAuction()
	const bidHistory = await getBidHistory(id)

	// Edit mode for drafts
	if (edit === "true" && ["draft", "scheduled"].includes(auction.status)) {
		return (
			<div className="flex flex-1 flex-col p-4 pt-0">
				<AuctionForm auction={auction} products={products} />
			</div>
		)
	}

	// View mode
	return (
		<div className="flex flex-1 flex-col p-4 pt-0">
			<AuctionDetail auction={auction} bidHistory={bidHistory} products={products} />
		</div>
	)
}
