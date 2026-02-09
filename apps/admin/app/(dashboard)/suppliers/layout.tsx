import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SuppliersLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.suppliers) {
		return <FeatureGatePage feature="suppliers" features={workspace.features} featureName="Suppliers" />
	}

	return <>{children}</>
}
