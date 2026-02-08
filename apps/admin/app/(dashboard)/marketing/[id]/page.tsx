import { notFound } from "next/navigation"
import { getDiscount } from "../actions"
import { DiscountDetail } from "./discount-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function DiscountDetailPage({ params }: PageProps) {
	const { id } = await params

	const discount = await getDiscount(id)
	if (!discount) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<DiscountDetail discount={discount} />
		</div>
	)
}
