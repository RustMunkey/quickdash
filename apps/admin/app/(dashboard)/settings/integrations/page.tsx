import { redirect } from "next/navigation"
import { checkWorkspacePermission, requireWorkspace } from "@/lib/workspace"
import { getSettings, getWorkspaceEmailConfig } from "../actions"
import { IntegrationsClient } from "./integrations-client"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function IntegrationsPage() {
	const workspace = await requireWorkspace()
	if (!workspace.features.integrations) {
		return <FeatureGatePage feature="integrations" features={workspace.features} featureName="Integrations" />
	}

	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		redirect("/settings")
	}

	const [settings, workspaceEmail] = await Promise.all([
		getSettings(),
		getWorkspaceEmailConfig(),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<IntegrationsClient settings={settings} workspaceEmail={workspaceEmail} />
		</div>
	)
}
