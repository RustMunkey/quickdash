import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function CampaignsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.campaigns) {
		return <FeatureGatePage feature="campaigns" features={workspace.features} featureName="Campaigns" />
	}

	return <>{children}</>
}
