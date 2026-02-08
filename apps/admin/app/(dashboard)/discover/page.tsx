import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getAllUsers, getFriends, getPendingFriendRequests } from "./actions"
import { DiscoverClient } from "./discover-client"

export default async function DiscoverPage() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect("/login")

	const [allUsers, friends, pendingRequests] = await Promise.all([
		getAllUsers(),
		getFriends(),
		getPendingFriendRequests(),
	])

	return (
		<DiscoverClient
			currentUser={{
				id: session.user.id,
				name: session.user.name || "",
				image: session.user.image || null,
			}}
			initialUsers={allUsers}
			initialFriends={friends}
			initialPendingRequests={pendingRequests}
		/>
	)
}
