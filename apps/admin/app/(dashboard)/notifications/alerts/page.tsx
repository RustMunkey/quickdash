import { getAlertRules } from "../actions"
import { AlertsClient } from "./alerts-client"

export default async function AlertsPage() {
	const rules = await getAlertRules()

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<AlertsClient rules={rules} />
		</div>
	)
}
