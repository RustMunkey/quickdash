import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { getUserProfile, getFriendshipStatus, getMutualFriends } from "@/app/(dashboard)/discover/actions"
import { ProfileClient } from "./profile-client"

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect("/login")

	const { userId } = await params
	const isOwnProfile = userId === session.user.id

	const [profile, friendshipStatus, mutualFriends] = await Promise.all([
		getUserProfile(userId),
		isOwnProfile ? Promise.resolve({ status: "self" as const }) : getFriendshipStatus(userId),
		isOwnProfile ? Promise.resolve([]) : getMutualFriends(userId),
	])

	if (!profile) notFound()

	return (
		<ProfileClient
			profile={profile}
			currentUserId={session.user.id}
			friendshipStatus={friendshipStatus}
			mutualFriends={mutualFriends}
			isOwnProfile={isOwnProfile}
		/>
	)
}
