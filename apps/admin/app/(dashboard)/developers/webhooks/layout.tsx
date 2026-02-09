import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function WebhookEventsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.webhookEvents) {
		return <FeatureGatePage feature="webhookEvents" features={workspace.features} featureName="Webhook Events" />
	}

	return <>{children}</>
}
