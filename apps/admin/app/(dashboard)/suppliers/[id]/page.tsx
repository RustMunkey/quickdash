import { notFound } from "next/navigation"
import { getSupplier } from "../actions"
import { SupplierDetail } from "./supplier-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: PageProps) {
	const { id } = await params

	const supplier = await getSupplier(id)
	if (!supplier) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<SupplierDetail supplier={supplier} />
		</div>
	)
}
