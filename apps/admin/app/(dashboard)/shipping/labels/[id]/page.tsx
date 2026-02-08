import { notFound } from "next/navigation"
import { getLabel } from "../../actions"
import { LabelDetail } from "./label-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function LabelDetailPage({ params }: PageProps) {
	const { id } = await params

	const label = await getLabel(id)
	if (!label) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<LabelDetail label={label} />
		</div>
	)
}
