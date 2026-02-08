import { redirect } from "next/navigation"
import { checkWorkspacePermission } from "@/lib/workspace"
import { getSettings } from "../actions"
import { PaymentSettings } from "./payment-settings"

export default async function PaymentsSettingsPage() {
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		redirect("/settings")
	}

	const settings = await getSettings("payments")

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<PaymentSettings settings={settings} />
		</div>
	)
}
