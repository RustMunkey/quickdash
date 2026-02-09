import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function CollectionsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.collections) {
		return <FeatureGatePage feature="collections" features={workspace.features} featureName="Collections" />
	}

	return <>{children}</>
}
