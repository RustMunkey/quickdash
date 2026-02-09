import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function TrackingLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.tracking) {
		return <FeatureGatePage feature="tracking" features={workspace.features} featureName="Shipping Tracking" />
	}

	return <>{children}</>
}
