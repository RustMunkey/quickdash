import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function AutomationLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.automation) {
		return <FeatureGatePage feature="automation" features={workspace.features} featureName="Automation" />
	}

	return <>{children}</>
}
