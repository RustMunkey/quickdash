import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { users, workspaceMembers, workspaces, githubTokens } from "@quickdash/db/schema"
import { ConnectStep } from "./connect-step"

export default async function ConnectPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		redirect("/login")
	}

	// Get user and their workspace
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (!user) {
		redirect("/login")
	}

	// Already completed onboarding
	if (user.onboardingCompletedAt) {
		redirect("/")
	}

	// Get user's workspace (they should have created one in previous step)
	const [membership] = await db
		.select({
			workspace: workspaces,
		})
		.from(workspaceMembers)
		.innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
		.where(eq(workspaceMembers.userId, session.user.id))
		.limit(1)

	// No workspace yet, go back to workspace step
	if (!membership?.workspace) {
		redirect("/onboarding/workspace")
	}

	// Check if GitHub is already connected
	const [githubToken] = await db
		.select()
		.from(githubTokens)
		.where(
			and(
				eq(githubTokens.userId, session.user.id),
				eq(githubTokens.isActive, true)
			)
		)
		.limit(1)

	return (
		<ConnectStep
			userName={user.name || "there"}
			workspaceId={membership.workspace.id}
			workspaceName={membership.workspace.name}
			hasGitHubConnected={!!githubToken}
			githubLogin={githubToken?.githubAccountLogin}
		/>
	)
}
