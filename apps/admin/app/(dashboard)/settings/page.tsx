import { getSettings } from "./actions"
import { GeneralSettings } from "./general-settings"

export default async function SettingsPage() {
	const settings = await getSettings("general")

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<GeneralSettings settings={settings} />
		</div>
	)
}
