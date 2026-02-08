import { redirect } from "next/navigation"
import { checkWorkspacePermission, requireWorkspace } from "@/lib/workspace"
import { getSettings, getWorkspaceEmailConfig, getWorkspaceStripeConfig, getWorkspacePayPalConfig, getWorkspacePolarConfig, getWorkspaceReownConfig } from "../actions"
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

	const [settings, workspaceEmail, workspaceStripe, workspacePayPal, workspacePolar, workspaceReown] = await Promise.all([
		getSettings(),
		getWorkspaceEmailConfig(),
		getWorkspaceStripeConfig(),
		getWorkspacePayPalConfig(),
		getWorkspacePolarConfig(),
		getWorkspaceReownConfig(),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<IntegrationsClient settings={settings} workspaceEmail={workspaceEmail} workspaceStripe={workspaceStripe} workspacePayPal={workspacePayPal} workspacePolar={workspacePolar} workspaceReown={workspaceReown} />
		</div>
	)
}
