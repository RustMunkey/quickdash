import { notFound } from "next/navigation"
import { getZone } from "../../actions"
import { ZoneDetail } from "./zone-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function ZoneDetailPage({ params }: PageProps) {
	const { id } = await params

	const zone = await getZone(id)
	if (!zone) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<ZoneDetail zone={zone} />
		</div>
	)
}
