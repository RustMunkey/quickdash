import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@quickdash/db/client"
import { users } from "@quickdash/db/schema"
import { eq, ne, and, isNotNull } from "@quickdash/db/drizzle"
import { DiscoverStep } from "./discover-step"

export default async function DiscoverPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect("/login")
	}

	// Get fresh user data
	const [user] = await db
		.select({ username: users.username, onboardingCompletedAt: users.onboardingCompletedAt })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	// Already completed onboarding, go to dashboard
	if (user?.onboardingCompletedAt) {
		redirect("/")
	}

	// If no username, go back to step 1
	if (!user?.username) {
		redirect("/onboarding")
	}

	// Get suggested users (users with completed profiles, excluding current user)
	const suggestedUsers = await db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
			bio: users.bio,
		})
		.from(users)
		.where(
			and(
				ne(users.id, session.user.id),
				isNotNull(users.username),
				isNotNull(users.onboardingCompletedAt)
			)
		)
		.limit(20)

	return (
		<DiscoverStep
			currentUserId={session.user.id}
			suggestedUsers={suggestedUsers}
		/>
	)
}
