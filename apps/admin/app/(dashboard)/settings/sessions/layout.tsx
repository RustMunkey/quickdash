import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function SessionsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.sessions) {
		return <FeatureGatePage feature="sessions" features={workspace.features} featureName="Sessions" />
	}

	return <>{children}</>
}
