import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@quickdash/db/client"
import { users } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"
import { ProfileStep } from "./profile-step"

export default async function OnboardingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect("/login")
	}

	// Get fresh user data with all profile fields
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (!user) {
		redirect("/login")
	}

	// Already completed onboarding, go to dashboard
	if (user.onboardingCompletedAt) {
		redirect("/")
	}

	return (
		<ProfileStep
			user={{
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				username: user.username,
				bio: user.bio,
				bannerImage: user.bannerImage,
				location: user.location,
				website: user.website,
				occupation: user.occupation,
				birthdate: user.birthdate,
			}}
		/>
	)
}
