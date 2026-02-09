import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function EmailTemplatesLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.emailTemplates) {
		return <FeatureGatePage feature="emailTemplates" features={workspace.features} featureName="Email Templates" />
	}

	return <>{children}</>
}
