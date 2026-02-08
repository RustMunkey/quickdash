import { notFound } from "next/navigation"
import { getGiftCard } from "../actions"
import { GiftCardDetail } from "./gift-card-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function GiftCardDetailPage({ params }: PageProps) {
	const { id } = await params

	let card
	try {
		card = await getGiftCard(id)
	} catch {
		notFound()
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<GiftCardDetail card={card} />
		</div>
	)
}
