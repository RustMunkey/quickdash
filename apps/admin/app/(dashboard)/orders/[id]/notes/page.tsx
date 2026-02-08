import { notFound } from "next/navigation"
import { getOrder, getOrderNotes } from "../../actions"
import { NotesClient } from "./notes-client"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function OrderNotesPage({ params }: PageProps) {
	const { id } = await params

	let order
	try {
		order = await getOrder(id)
	} catch {
		notFound()
	}

	const notes = await getOrderNotes(id)

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0 min-h-0">
			<NotesClient order={{ id: order.id, orderNumber: order.orderNumber }} notes={notes} />
		</div>
	)
}
