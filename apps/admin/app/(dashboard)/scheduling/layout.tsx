import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SchedulingLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.scheduling) {
		return <FeatureGatePage feature="scheduling" features={workspace.features} featureName="Scheduling" />
	}

	return <>{children}</>
}
