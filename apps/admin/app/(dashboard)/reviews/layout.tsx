import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function ReviewsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.reviews) {
		return <FeatureGatePage feature="reviews" features={workspace.features} featureName="Reviews" />
	}

	return <>{children}</>
}
