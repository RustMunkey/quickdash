import { notFound } from "next/navigation"
import { getOrder, getOrderActivity } from "../../actions"
import { OrderDetail } from "../../[id]/order-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function ReturnDetailPage({ params }: PageProps) {
	const { id } = await params

	let order
	try {
		order = await getOrder(id)
	} catch {
		notFound()
	}

	const activity = await getOrderActivity(id)

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0 md:max-h-[calc(100svh-4rem)] md:min-h-0 md:overflow-hidden">
			<OrderDetail order={order} activity={activity} />
		</div>
	)
}
