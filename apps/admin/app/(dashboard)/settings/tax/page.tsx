import { getSettings } from "../actions"
import { TaxSettings } from "./tax-settings"

export default async function TaxSettingsPage() {
	const settings = await getSettings("tax")

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<TaxSettings settings={settings} />
		</div>
	)
}
