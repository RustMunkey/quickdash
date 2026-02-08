import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { githubTokens, userWorkspacePreferences } from "@quickdash/db/schema"
import { SitesClient } from "./sites-client"

export default async function SitesSettingsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect("/login")
	}

	// Get user's active workspace
	const [pref] = await db
		.select()
		.from(userWorkspacePreferences)
		.where(eq(userWorkspacePreferences.userId, session.user.id))
		.limit(1)

	if (!pref?.activeWorkspaceId) {
		redirect("/onboarding/workspace")
	}

	// Check if GitHub is connected
	const [githubToken] = await db
		.select({
			login: githubTokens.githubAccountLogin,
			avatar: githubTokens.githubAccountAvatar,
		})
		.from(githubTokens)
		.where(
			and(
				eq(githubTokens.userId, session.user.id),
				eq(githubTokens.isActive, true)
			)
		)
		.limit(1)

	return (
		<SitesClient
			workspaceId={pref.activeWorkspaceId}
			hasGitHubConnected={!!githubToken}
			githubAccount={githubToken}
		/>
	)
}
