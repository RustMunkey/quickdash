import { redirect } from "next/navigation"
import { checkWorkspacePermission, requireWorkspace } from "@/lib/workspace"
import { getSettings, getWorkspaceStripeConfig, getWorkspacePayPalConfig, getWorkspacePolarConfig, getWorkspaceReownConfig, getWorkspaceShopifyConfig, getWorkspaceSquareConfig } from "../actions"
import { PaymentSettings } from "./payment-settings"

export default async function PaymentsSettingsPage() {
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		redirect("/settings")
	}

	const workspace = await requireWorkspace()

	const [settings, workspaceStripe, workspacePayPal, workspacePolar, workspaceReown, workspaceShopify, workspaceSquare] = await Promise.all([
		getSettings("payments"),
		getWorkspaceStripeConfig(),
		getWorkspacePayPalConfig(),
		getWorkspacePolarConfig(),
		getWorkspaceReownConfig(),
		getWorkspaceShopifyConfig(),
		getWorkspaceSquareConfig(),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<PaymentSettings
				settings={settings}
				workspaceId={workspace.id}
				workspaceStripe={workspaceStripe}
				workspacePayPal={workspacePayPal}
				workspacePolar={workspacePolar}
				workspaceReown={workspaceReown}
				workspaceShopify={workspaceShopify}
				workspaceSquare={workspaceSquare}
			/>
		</div>
	)
}
