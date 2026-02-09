import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function ExportsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.exports) {
		return <FeatureGatePage feature="exports" features={workspace.features} featureName="Exports" />
	}

	return <>{children}</>
}
