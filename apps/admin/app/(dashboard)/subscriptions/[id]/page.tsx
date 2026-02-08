import { notFound } from "next/navigation"
import { getSubscription } from "../actions"
import { SubscriptionDetail } from "./subscription-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function SubscriptionDetailPage({ params }: PageProps) {
	const { id } = await params

	const subscription = await getSubscription(id)
	if (!subscription) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<SubscriptionDetail subscription={subscription} />
		</div>
	)
}
