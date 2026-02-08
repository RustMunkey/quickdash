import { notFound } from "next/navigation"
import { getCustomer } from "../actions"
import { CustomerDetail } from "./customer-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
	const { id } = await params

	let customer
	try {
		customer = await getCustomer(id)
	} catch {
		notFound()
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<CustomerDetail customer={customer} />
		</div>
	)
}
