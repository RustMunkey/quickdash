import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function AuctionsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.auctions) {
		return <FeatureGatePage feature="auctions" features={workspace.features} featureName="Auctions" />
	}

	return <>{children}</>
}
