import { notFound } from "next/navigation"
import { getPurchaseOrder } from "../../actions"
import { PODetail } from "./po-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
	const { id } = await params

	const order = await getPurchaseOrder(id)
	if (!order) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<PODetail order={order} />
		</div>
	)
}
