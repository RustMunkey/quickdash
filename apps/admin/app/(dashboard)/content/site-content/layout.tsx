import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SiteContentLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.siteContent) {
		return <FeatureGatePage feature="siteContent" features={workspace.features} featureName="Site Content" />
	}

	return <>{children}</>
}
