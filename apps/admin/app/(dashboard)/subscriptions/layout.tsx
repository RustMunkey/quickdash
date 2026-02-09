import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SubscriptionsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.subscriptions) {
		return <FeatureGatePage feature="subscriptions" features={workspace.features} featureName="Subscriptions" />
	}

	return <>{children}</>
}
