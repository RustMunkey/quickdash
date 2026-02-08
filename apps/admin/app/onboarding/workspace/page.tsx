import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { WorkspaceStep } from "./workspace-step"
import { db } from "@quickdash/db/client"
import { users, workspaceMembers } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"

export default async function WorkspacePage() {
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

	// Check if user already has a workspace
	const existingWorkspace = await db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, session.user.id))
		.limit(1)

	const hasWorkspace = existingWorkspace.length > 0

	return (
		<WorkspaceStep
			userName={session.user.name}
			hasExistingWorkspace={hasWorkspace}
		/>
	)
}
