import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getNotificationPreferences } from "./actions"
import { NotificationPreferencesSettings } from "./notification-preferences"

export default async function NotificationPreferencesPage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) redirect("/login")

	const preferences = await getNotificationPreferences()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<NotificationPreferencesSettings preferences={preferences} />
		</div>
	)
}
