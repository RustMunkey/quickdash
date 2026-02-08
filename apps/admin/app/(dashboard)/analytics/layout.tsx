import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function AnalyticsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.analytics) {
		return <FeatureGatePage feature="analytics" features={workspace.features} featureName="Analytics" />
	}

	return <>{children}</>
}
