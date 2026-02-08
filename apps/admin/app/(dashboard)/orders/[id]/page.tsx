import { notFound } from "next/navigation"
import { getOrder, getOrderActivity } from "../actions"
import { getTrackingByOrderId } from "../../shipping/actions"
import { OrderDetail } from "./order-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
	const { id } = await params

	let order
	try {
		order = await getOrder(id)
	} catch {
		notFound()
	}

	const [activity, trackingRaw] = await Promise.all([
		getOrderActivity(id),
		getTrackingByOrderId(id),
	])

	// Ensure statusHistory is always an array (not null)
	const tracking = trackingRaw
		? { ...trackingRaw, statusHistory: trackingRaw.statusHistory ?? [] }
		: null

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0 md:max-h-[calc(100svh-4rem)] md:min-h-0 md:overflow-hidden">
			<OrderDetail order={order} activity={activity} tracking={tracking} />
		</div>
	)
}
