import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function GiftCardsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.giftCards) {
		return <FeatureGatePage feature="giftCards" features={workspace.features} featureName="Gift Cards" />
	}

	return <>{children}</>
}
