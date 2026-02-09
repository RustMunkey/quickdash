import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function CRMLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.crm) {
		return <FeatureGatePage feature="crm" features={workspace.features} featureName="CRM" />
	}

	return <>{children}</>
}
