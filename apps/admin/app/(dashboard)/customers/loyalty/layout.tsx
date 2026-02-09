import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function LoyaltyLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.loyalty) {
		return <FeatureGatePage feature="loyalty" features={workspace.features} featureName="Loyalty & Rewards" />
	}

	return <>{children}</>
}
