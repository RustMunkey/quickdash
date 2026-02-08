"use server"

import { db } from "@quickdash/db/client"
import { users, workspaces, workspaceMembers, userWorkspacePreferences, workspaceInvites, storeSettings, TIER_LIMITS, type SubscriptionTier } from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { nanoid } from "nanoid"

async function getUser() {
	const session = await auth.api.getSession({
		headers: await headers(),
	})
	if (!session?.user) {
		throw new Error("Not authenticated")
	}
	return session.user
}

// Step 1: Update profile (display name, username, avatar, banner, bio, etc.)
export async function updateProfile(formData: FormData) {
	const user = await getUser()
	const displayName = formData.get("displayName") as string
	const username = formData.get("username") as string
	const image = formData.get("image") as string | null
	const bannerImage = formData.get("bannerImage") as string | null
	const bannerGradient = formData.get("bannerGradient") as string | null
	const bio = formData.get("bio") as string | null
	const location = formData.get("location") as string | null
	const website = formData.get("website") as string | null
	const occupation = formData.get("occupation") as string | null
	const birthdate = formData.get("birthdate") as string | null

	if (!displayName || displayName.trim().length < 1) {
		return { error: "Please enter a display name" }
	}

	if (!username || username.length < 3) {
		return { error: "Username must be at least 3 characters" }
	}

	// Check if username is taken
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username.toLowerCase()))
		.limit(1)

	if (existing.length > 0 && existing[0].id !== user.id) {
		return { error: "Username is already taken" }
	}

	await db
		.update(users)
		.set({
			name: displayName.trim(),
			username: username.toLowerCase(),
			...(image && { image }),
			...(bannerImage && { bannerImage, bannerGradient: null }),
			...(!bannerImage && bannerGradient && { bannerGradient, bannerImage: null }),
			...(bio !== null && { bio: bio.trim() || null }),
			...(location !== null && { location: location.trim() || null }),
			...(website !== null && { website: website.trim() || null }),
			...(occupation !== null && { occupation: occupation.trim() || null }),
			...(birthdate && { birthdate }),
			updatedAt: new Date(),
		})
		.where(eq(users.id, user.id))

	revalidatePath("/onboarding")
	return { success: true }
}

// Step 2: Create workspace
export async function createWorkspace(formData: FormData) {
	const user = await getUser()
	const name = formData.get("name") as string
	const workspaceType = formData.get("workspaceType") as string || "ecommerce"

	if (!name || name.length < 2) {
		return { error: "Workspace name must be at least 2 characters" }
	}

	// Generate unique slug
	const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
	let slug = baseSlug
	let attempts = 0

	while (attempts < 10) {
		const existing = await db
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(eq(workspaces.slug, slug))
			.limit(1)

		if (existing.length === 0) break
		slug = `${baseSlug}-${nanoid(4)}`
		attempts++
	}

	// Get user's tier for workspace limits
	const [dbUser] = await db
		.select({ subscriptionTier: users.subscriptionTier })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)
	const userTier = (dbUser?.subscriptionTier || "free") as SubscriptionTier
	const limits = TIER_LIMITS[userTier]

	// Create workspace with limits from user's tier
	const [workspace] = await db
		.insert(workspaces)
		.values({
			name,
			slug,
			ownerId: user.id,
			workspaceType,
			maxStorefronts: limits.storefronts,
			maxTeamMembers: limits.teamMembers,
			features: limits.features,
		})
		.returning()

	// Add user as owner member
	await db.insert(workspaceMembers).values({
		workspaceId: workspace.id,
		userId: user.id,
		role: "owner",
	})

	// Save storefront URL if domain was provided
	const domain = formData.get("domain") as string | null
	if (domain?.trim()) {
		const storefrontUrl = `https://${domain.trim().toLowerCase()}.quickdash.net`
		await db.insert(storeSettings).values({
			workspaceId: workspace.id,
			key: "storefront_url",
			value: storefrontUrl,
			group: "domain",
			updatedBy: user.id,
		})
	}

	// Set as active workspace
	await db
		.insert(userWorkspacePreferences)
		.values({
			userId: user.id,
			activeWorkspaceId: workspace.id,
		})
		.onConflictDoUpdate({
			target: userWorkspacePreferences.userId,
			set: {
				activeWorkspaceId: workspace.id,
				updatedAt: new Date(),
			},
		})

	revalidatePath("/onboarding")
	return { success: true, workspaceId: workspace.id }
}

// Complete onboarding and check for pending workspace invites
export async function completeOnboarding() {
	const user = await getUser()

	// Mark onboarding as complete
	await db
		.update(users)
		.set({
			onboardingCompletedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(users.id, user.id))

	// Check for pending workspace invites for this user's email
	const pendingInvites = await db
		.select()
		.from(workspaceInvites)
		.where(
			and(
				eq(workspaceInvites.email, user.email),
				eq(workspaceInvites.acceptedAt, null as unknown as Date)
			)
		)

	// Accept all pending invites
	for (const invite of pendingInvites) {
		// Add user to workspace
		await db
			.insert(workspaceMembers)
			.values({
				workspaceId: invite.workspaceId,
				userId: user.id,
				role: invite.role,
			})
			.onConflictDoNothing()

		// Mark invite as accepted
		await db
			.update(workspaceInvites)
			.set({ acceptedAt: new Date() })
			.where(eq(workspaceInvites.id, invite.id))
	}

	revalidatePath("/")
	redirect("/")
}

// Skip workspace creation (creates a default one)
export async function skipWorkspaceCreation() {
	const user = await getUser()

	// Check if user already has a workspace
	const existingMembership = await db
		.select({ workspaceId: workspaceMembers.workspaceId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.userId, user.id))
		.limit(1)

	if (existingMembership.length === 0) {
		// Get user's tier for workspace limits
		const [dbUser] = await db
			.select({ subscriptionTier: users.subscriptionTier })
			.from(users)
			.where(eq(users.id, user.id))
			.limit(1)
		const userTier = (dbUser?.subscriptionTier || "free") as SubscriptionTier
		const skipLimits = TIER_LIMITS[userTier]

		// Create a default workspace
		const [workspace] = await db
			.insert(workspaces)
			.values({
				name: `${user.name}'s Workspace`,
				slug: `workspace-${nanoid(8)}`,
				ownerId: user.id,
				workspaceType: "other",
				maxStorefronts: skipLimits.storefronts,
				maxTeamMembers: skipLimits.teamMembers,
				features: skipLimits.features,
			})
			.returning()

		await db.insert(workspaceMembers).values({
			workspaceId: workspace.id,
			userId: user.id,
			role: "owner",
		})

		await db
			.insert(userWorkspacePreferences)
			.values({
				userId: user.id,
				activeWorkspaceId: workspace.id,
			})
			.onConflictDoUpdate({
				target: userWorkspacePreferences.userId,
				set: {
					activeWorkspaceId: workspace.id,
					updatedAt: new Date(),
				},
			})
	}

	// Go to connect step
	revalidatePath("/onboarding")
	redirect("/onboarding/connect")
}

// Check username availability
export async function checkUsername(username: string) {
	if (!username || username.length < 3) {
		return { available: false, error: "Username must be at least 3 characters" }
	}

	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username.toLowerCase()))
		.limit(1)

	return { available: existing.length === 0 }
}
