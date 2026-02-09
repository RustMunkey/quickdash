import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SegmentsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.segments) {
		return <FeatureGatePage feature="segments" features={workspace.features} featureName="Segments" />
	}

	return <>{children}</>
}
