import { getSettings } from "../actions"
import { ShippingSettings } from "./shipping-settings"

export default async function ShippingSettingsPage() {
	const settings = await getSettings("shipping")

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<ShippingSettings settings={settings} />
		</div>
	)
}
