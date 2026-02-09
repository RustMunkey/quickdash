"use server"

import { db } from "@quickdash/db/client"
import {
	workspaces,
	workspaceMembers,
	workspaceInvites,
	userWorkspacePreferences,
	storefronts,
	users,
	type WorkspaceMemberRole,
	type SubscriptionTier,
	type WorkspaceFeatures,
	TIER_LIMITS,
	TIER_INFO,
} from "@quickdash/db/schema"
import { eq, and, sql, isNull } from "@quickdash/db/drizzle"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { cache } from "react"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

// Types
export type WorkspaceContext = {
	id: string
	name: string
	slug: string
	ownerId: string
	userId: string // The current logged-in user's ID
	maxStorefronts: number
	maxTeamMembers: number
	features: WorkspaceFeatures
	role: WorkspaceMemberRole
	permissions: {
		canManageProducts?: boolean
		canManageOrders?: boolean
		canManageCustomers?: boolean
		canManageSettings?: boolean
		canManageTeam?: boolean
		canManageBilling?: boolean
	}
}

export type WorkspaceWithRole = {
	id: string
	name: string
	slug: string
	logo: string | null
	role: WorkspaceMemberRole
	ownerId: string
}

// Get the current authenticated user (cached per request)
const getUser = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	})
	return session?.user ?? null
})

/**
 * Get user's active workspace with their role and permissions
 * Returns null if no active workspace is set or user isn't a member
 */
export async function getActiveWorkspace(): Promise<WorkspaceContext | null> {
	const user = await getUser()
	if (!user) return null

	// Get user's active workspace preference
	const [pref] = await db
		.select({ activeWorkspaceId: userWorkspacePreferences.activeWorkspaceId })
		.from(userWorkspacePreferences)
		.where(eq(userWorkspacePreferences.userId, user.id))
		.limit(1)

	if (!pref?.activeWorkspaceId) {
		// No preference set - try to get their first workspace
		const firstWorkspace = await getUserWorkspaces()
		if (firstWorkspace.length > 0) {
			// Auto-set their first workspace as active
			await setActiveWorkspace(firstWorkspace[0].id)
			return getActiveWorkspace() // Recurse with the new setting
		}
		return null
	}

	// Get workspace with user's membership + owner's subscription tier
	const [result] = await db
		.select({
			workspace: workspaces,
			member: workspaceMembers,
			ownerTier: users.subscriptionTier,
		})
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			and(
				eq(workspaceMembers.workspaceId, workspaces.id),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.innerJoin(users, eq(users.id, workspaces.ownerId))
		.where(eq(workspaces.id, pref.activeWorkspaceId))
		.limit(1)

	if (!result) {
		// Stored workspace no longer exists or user lost access — fall back to first available
		const fallback = await getUserWorkspaces()
		if (fallback.length > 0) {
			await setActiveWorkspace(fallback[0].id)
			return getActiveWorkspace()
		}
		// No workspaces at all — clear stale preference
		await db
			.update(userWorkspacePreferences)
			.set({ activeWorkspaceId: null, updatedAt: new Date() })
			.where(eq(userWorkspacePreferences.userId, user.id))
		return null
	}

	const ownerTier = (result.ownerTier || "hobby") as SubscriptionTier
	const tierLimits = TIER_LIMITS[ownerTier]

	return {
		id: result.workspace.id,
		name: result.workspace.name,
		slug: result.workspace.slug,
		ownerId: result.workspace.ownerId,
		userId: user.id,
		maxStorefronts: result.workspace.maxStorefronts ?? tierLimits.storefronts,
		maxTeamMembers: result.workspace.maxTeamMembers ?? tierLimits.teamMembers,
		features: result.workspace.features ?? tierLimits.features,
		role: result.member.role,
		permissions: result.member.permissions ?? {},
	}
}

/**
 * Get active workspace or throw an error
 * Use this in server actions that require workspace context
 */
export async function requireWorkspace(): Promise<WorkspaceContext> {
	const workspace = await getActiveWorkspace()
	if (!workspace) {
		throw new Error("No active workspace. Please select or create a workspace.")
	}
	return workspace
}

/**
 * Get all workspaces the user has access to (owned + member of)
 */
export async function getUserWorkspaces(): Promise<WorkspaceWithRole[]> {
	const user = await getUser()
	if (!user) return []

	const results = await db
		.select({
			id: workspaces.id,
			name: workspaces.name,
			slug: workspaces.slug,
			logo: workspaces.logo,
			ownerId: workspaces.ownerId,
			role: workspaceMembers.role,
		})
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			and(
				eq(workspaceMembers.workspaceId, workspaces.id),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.orderBy(workspaces.name)

	return results
}

/**
 * Set the user's active workspace
 */
export async function setActiveWorkspace(workspaceId: string): Promise<void> {
	const user = await getUser()
	if (!user) throw new Error("Not authenticated")

	// Verify user is a member of this workspace
	const [membership] = await db
		.select({ id: workspaceMembers.id })
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.limit(1)

	if (!membership) {
		throw new Error("You are not a member of this workspace")
	}

	// Upsert the preference
	await db
		.insert(userWorkspacePreferences)
		.values({
			userId: user.id,
			activeWorkspaceId: workspaceId,
		})
		.onConflictDoUpdate({
			target: userWorkspacePreferences.userId,
			set: {
				activeWorkspaceId: workspaceId,
				updatedAt: new Date(),
			},
		})
}

/**
 * Check if user has a specific permission in the current workspace
 * Owners and admins have all permissions by default
 */
export async function checkWorkspacePermission(
	permission: keyof WorkspaceContext["permissions"]
): Promise<boolean> {
	const workspace = await getActiveWorkspace()
	if (!workspace) return false

	// Owners and admins have all permissions
	if (workspace.role === "owner" || workspace.role === "admin") {
		return true
	}

	// Check specific permission override
	if (workspace.permissions[permission] !== undefined) {
		return workspace.permissions[permission]!
	}

	// Default permissions by role
	const roleDefaults: Record<WorkspaceMemberRole, Record<string, boolean>> = {
		owner: {}, // All true (handled above)
		admin: {}, // All true (handled above)
		member: {
			canManageProducts: true,
			canManageOrders: true,
			canManageCustomers: true,
			canManageSettings: false,
			canManageTeam: false,
			canManageBilling: false,
		},
		viewer: {
			canManageProducts: false,
			canManageOrders: false,
			canManageCustomers: false,
			canManageSettings: false,
			canManageTeam: false,
			canManageBilling: false,
		},
	}

	return roleDefaults[workspace.role]?.[permission] ?? false
}

/**
 * Check if the workspace has a specific feature enabled (based on tier)
 */
export async function checkWorkspaceFeature(
	feature: keyof WorkspaceFeatures
): Promise<boolean> {
	const workspace = await getActiveWorkspace()
	if (!workspace) return false
	return workspace.features[feature] ?? false
}

/**
 * Get workspace by ID (with membership check)
 */
export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceContext | null> {
	const user = await getUser()
	if (!user) return null

	const [result] = await db
		.select({
			workspace: workspaces,
			member: workspaceMembers,
			ownerTier: users.subscriptionTier,
		})
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			and(
				eq(workspaceMembers.workspaceId, workspaces.id),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.innerJoin(users, eq(users.id, workspaces.ownerId))
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!result) return null

	const ownerTier = (result.ownerTier || "hobby") as SubscriptionTier
	const tierLimits = TIER_LIMITS[ownerTier]

	return {
		id: result.workspace.id,
		name: result.workspace.name,
		slug: result.workspace.slug,
		ownerId: result.workspace.ownerId,
		userId: user.id,
		maxStorefronts: result.workspace.maxStorefronts ?? tierLimits.storefronts,
		maxTeamMembers: result.workspace.maxTeamMembers ?? tierLimits.teamMembers,
		features: result.workspace.features ?? tierLimits.features,
		role: result.member.role,
		permissions: result.member.permissions ?? {},
	}
}

/**
 * Create a new workspace
 * Called from the workspace sidebar create dialog
 */
export async function createWorkspaceAction(
	name: string,
	workspaceType: string = "ecommerce"
): Promise<{ success?: boolean; error?: string; workspaceId?: string }> {
	const user = await getUser()
	if (!user) return { error: "Not authenticated" }

	if (!name || name.length < 2) {
		return { error: "Workspace name must be at least 2 characters" }
	}

	// Get user's subscription tier to enforce limits
	const subscription = await getUserSubscription()
	const limits = TIER_LIMITS[subscription.tier]

	// Check workspace limits
	const userWsList = await getUserWorkspaces()
	const ownedWorkspaces = userWsList.filter(w => w.ownerId === user.id)

	if (limits.workspaces !== -1 && ownedWorkspaces.length >= limits.workspaces) {
		const tierName = TIER_INFO[subscription.tier].name
		return { error: `Your ${tierName} plan allows up to ${limits.workspaces} workspace${limits.workspaces === 1 ? "" : "s"}. Upgrade to create more.` }
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

	// Create a default storefront for this workspace
	const apiKey = `sf_${nanoid(32)}`
	const apiSecret = `sfs_${nanoid(48)}`

	await db.insert(storefronts).values({
		workspaceId: workspace.id,
		name: `${name} Storefront`,
		apiKey,
		apiSecret,
		permissions: {
			products: true,
			orders: true,
			customers: true,
			checkout: true,
			inventory: false,
		},
	})

	revalidatePath("/")
	return { success: true, workspaceId: workspace.id }
}

/**
 * Delete a workspace (owner only)
 */
export async function deleteWorkspaceAction(
	workspaceId: string
): Promise<{ success?: boolean; error?: string }> {
	const user = await getUser()
	if (!user) return { error: "Not authenticated" }

	// Verify user is the owner
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!workspace) {
		return { error: "Workspace not found" }
	}

	if (workspace.ownerId !== user.id) {
		return { error: "Only the workspace owner can delete it" }
	}

	// Delete the workspace (cascades to members, storefronts, etc.)
	await db.delete(workspaces).where(eq(workspaces.id, workspaceId))

	// If this was the active workspace, clear the preference
	await db
		.update(userWorkspacePreferences)
		.set({ activeWorkspaceId: null, updatedAt: new Date() })
		.where(
			and(
				eq(userWorkspacePreferences.userId, user.id),
				eq(userWorkspacePreferences.activeWorkspaceId, workspaceId)
			)
		)

	revalidatePath("/")
	return { success: true }
}

/**
 * Leave a workspace (non-owner)
 */
export async function leaveWorkspaceAction(
	workspaceId: string
): Promise<{ success?: boolean; error?: string }> {
	const user = await getUser()
	if (!user) return { error: "Not authenticated" }

	// Verify user is not the owner
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!workspace) {
		return { error: "Workspace not found" }
	}

	if (workspace.ownerId === user.id) {
		return { error: "Owners cannot leave their workspace. Transfer ownership or delete it instead." }
	}

	// Remove membership
	await db
		.delete(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, user.id)
			)
		)

	// If this was the active workspace, clear the preference
	await db
		.update(userWorkspacePreferences)
		.set({ activeWorkspaceId: null, updatedAt: new Date() })
		.where(
			and(
				eq(userWorkspacePreferences.userId, user.id),
				eq(userWorkspacePreferences.activeWorkspaceId, workspaceId)
			)
		)

	revalidatePath("/")
	return { success: true }
}

/**
 * Get the current user's subscription info
 */
export async function getUserSubscription(): Promise<{
	tier: SubscriptionTier
	status: string
	polarSubscriptionId: string | null
	limits: (typeof TIER_LIMITS)[SubscriptionTier]
	features: WorkspaceFeatures
}> {
	const user = await getUser()
	if (!user) throw new Error("Not authenticated")

	const [dbUser] = await db
		.select({
			subscriptionTier: users.subscriptionTier,
			subscriptionStatus: users.subscriptionStatus,
			polarSubscriptionId: users.polarSubscriptionId,
		})
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)

	const tier = (dbUser?.subscriptionTier || "hobby") as SubscriptionTier
	const limits = TIER_LIMITS[tier]

	return {
		tier,
		status: dbUser?.subscriptionStatus || "active",
		polarSubscriptionId: dbUser?.polarSubscriptionId || null,
		limits,
		features: limits.features,
	}
}

/**
 * Check if adding a storefront would exceed the workspace limit
 */
export async function checkStorefrontLimit(workspaceId: string): Promise<{
	allowed: boolean
	used: number
	limit: number
}> {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(storefronts)
		.where(eq(storefronts.workspaceId, workspaceId))

	const [ws] = await db
		.select({ maxStorefronts: workspaces.maxStorefronts })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	const used = result?.count ?? 0
	const limit = ws?.maxStorefronts ?? 1

	return {
		allowed: limit === -1 || used < limit,
		used,
		limit,
	}
}

/**
 * Check if adding a team member would exceed the workspace limit
 */
export async function checkTeamMemberLimit(workspaceId: string): Promise<{
	allowed: boolean
	used: number
	limit: number
}> {
	// Count existing members
	const [memberResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspaceId))

	// Count pending invites
	const [inviteResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(workspaceInvites)
		.where(
			and(
				eq(workspaceInvites.workspaceId, workspaceId),
				isNull(workspaceInvites.acceptedAt)
			)
		)

	const [ws] = await db
		.select({ maxTeamMembers: workspaces.maxTeamMembers })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	const used = (memberResult?.count ?? 0) + (inviteResult?.count ?? 0)
	const limit = ws?.maxTeamMembers ?? 3

	return {
		allowed: limit === -1 || used < limit,
		used,
		limit,
	}
}
