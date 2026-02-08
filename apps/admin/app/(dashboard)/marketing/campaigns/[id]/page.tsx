import { notFound } from "next/navigation"
import { getCampaign } from "../../actions"
import { CampaignDetail } from "./campaign-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: PageProps) {
	const { id } = await params

	const campaign = await getCampaign(id)
	if (!campaign) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<CampaignDetail campaign={campaign} />
		</div>
	)
}
