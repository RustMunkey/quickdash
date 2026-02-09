import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SEOLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.seo) {
		return <FeatureGatePage feature="seo" features={workspace.features} featureName="SEO" />
	}

	return <>{children}</>
}
