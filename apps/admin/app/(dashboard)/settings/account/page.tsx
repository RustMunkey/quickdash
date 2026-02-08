import { redirect } from "next/navigation"
import { getCurrentUser } from "./actions"
import { AccountSettings } from "./account-settings"

export default async function AccountPage() {
	const user = await getCurrentUser()
	if (!user) redirect("/login")

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<AccountSettings key={`${user.name}-${user.image}-${user.bannerImage}-${user.phone}`} user={user} />
		</div>
	)
}
