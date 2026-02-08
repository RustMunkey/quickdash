"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { users, sessions, workspaceMembers, workspaces, userWorkspacePreferences } from "@quickdash/db/schema"
import { eq, and, ne } from "@quickdash/db/drizzle"

export async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id))
	return user ?? null
}

export async function updateProfile(data: {
	name?: string
	phone?: string
	image?: string
	bannerImage?: string
	username?: string
	bio?: string
	location?: string
	website?: string
	occupation?: string
	birthdate?: string
}) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")

	const [updated] = await db
		.update(users)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(users.id, session.user.id))
		.returning()

	revalidatePath("/", "layout")

	return updated
}

/**
 * Sign out of all sessions except the current one
 */
export async function signOutAllSessions() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")

	// Delete all sessions for this user except the current one
	await db
		.delete(sessions)
		.where(
			and(
				eq(sessions.userId, session.user.id),
				ne(sessions.id, session.session.id)
			)
		)

	return { success: true }
}

/**
 * Delete the user's account and all associated data
 * This is a destructive action and cannot be undone
 */
export async function deleteAccount(confirmEmail: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Not authenticated")

	// Verify the email matches
	if (confirmEmail.toLowerCase() !== session.user.email.toLowerCase()) {
		throw new Error("Email confirmation does not match")
	}

	const userId = session.user.id

	// Get workspaces where user is the ONLY owner
	const ownedWorkspaces = await db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.userId, userId),
				eq(workspaceMembers.role, "owner")
			)
		)

	// For each workspace where user is owner, check if there are other members
	for (const { workspaceId } of ownedWorkspaces) {
		const otherMembers = await db
			.select({ id: workspaceMembers.id })
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					ne(workspaceMembers.userId, userId)
				)
			)
			.limit(1)

		// If no other members, delete the workspace (cascade will delete related data)
		if (otherMembers.length === 0) {
			await db.delete(workspaces).where(eq(workspaces.id, workspaceId))
		} else {
			// Transfer ownership to the first other member
			const [firstMember] = otherMembers
			await db
				.update(workspaceMembers)
				.set({ role: "owner" })
				.where(eq(workspaceMembers.id, firstMember.id))
		}
	}

	// Delete the user (cascade will handle most related data)
	await db.delete(users).where(eq(users.id, userId))

	// Redirect to login page
	redirect("/login?deleted=true")
}
