import { notFound } from "next/navigation"
import { getCarrier } from "../actions"
import { CarrierDetail } from "./carrier-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function CarrierDetailPage({ params }: PageProps) {
	const { id } = await params

	const carrier = await getCarrier(id)
	if (!carrier) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<CarrierDetail carrier={carrier} />
		</div>
	)
}
