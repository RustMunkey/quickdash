"use server"

import { db } from "@quickdash/db/client"
import {
	workspaces,
	workspaceMembers,
	userWorkspacePreferences,
	storefronts,
	type WorkspaceMemberRole,
	type SubscriptionTier,
	type WorkspaceFeatures,
	TIER_LIMITS
} from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"
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
	subscriptionTier: SubscriptionTier
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
	subscriptionTier: SubscriptionTier
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

	// Get workspace with user's membership
	const [result] = await db
		.select({
			workspace: workspaces,
			member: workspaceMembers,
		})
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			and(
				eq(workspaceMembers.workspaceId, workspaces.id),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.where(eq(workspaces.id, pref.activeWorkspaceId))
		.limit(1)

	if (!result) return null

	return {
		id: result.workspace.id,
		name: result.workspace.name,
		slug: result.workspace.slug,
		ownerId: result.workspace.ownerId,
		userId: user.id, // The current logged-in user
		subscriptionTier: result.workspace.subscriptionTier,
		features: result.workspace.features ?? TIER_LIMITS[result.workspace.subscriptionTier].features,
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
			subscriptionTier: workspaces.subscriptionTier,
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
		})
		.from(workspaces)
		.innerJoin(
			workspaceMembers,
			and(
				eq(workspaceMembers.workspaceId, workspaces.id),
				eq(workspaceMembers.userId, user.id)
			)
		)
		.where(eq(workspaces.id, workspaceId))
		.limit(1)

	if (!result) return null

	return {
		id: result.workspace.id,
		name: result.workspace.name,
		slug: result.workspace.slug,
		ownerId: result.workspace.ownerId,
		userId: user.id, // The current logged-in user
		subscriptionTier: result.workspace.subscriptionTier,
		features: result.workspace.features ?? TIER_LIMITS[result.workspace.subscriptionTier].features,
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

	// Check workspace limits based on user's current tier
	const userWorkspaces = await getUserWorkspaces()
	const ownedWorkspaces = userWorkspaces.filter(w => w.role === "owner")

	// For now, allow up to 5 workspaces (can be gated by subscription later)
	const maxWorkspaces = 5
	if (ownedWorkspaces.length >= maxWorkspaces) {
		return { error: `You can only create up to ${maxWorkspaces} workspaces` }
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

	// Create workspace
	const [workspace] = await db
		.insert(workspaces)
		.values({
			name,
			slug,
			ownerId: user.id,
			workspaceType,
			subscriptionTier: "beta", // Give beta tier for now
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
