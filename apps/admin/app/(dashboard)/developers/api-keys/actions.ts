"use server"

import { eq, desc, and } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { adminApiKeys } from "@quickdash/db/schema"
import { DEFAULT_API_KEY_PERMISSIONS, type ApiKeyPermissions } from "./shared"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { generateApiKey } from "@/lib/admin-api"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

async function requireAdminApiPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage API keys")
	}
	return workspace
}

async function getCurrentUserId() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user?.id) {
		throw new Error("Not authenticated")
	}
	return session.user.id
}

export async function getAdminApiKeys() {
	const workspace = await requireAdminApiPermission()

	return db
		.select({
			id: adminApiKeys.id,
			name: adminApiKeys.name,
			description: adminApiKeys.description,
			keyPrefix: adminApiKeys.keyPrefix,
			permissions: adminApiKeys.permissions,
			environment: adminApiKeys.environment,
			isActive: adminApiKeys.isActive,
			expiresAt: adminApiKeys.expiresAt,
			lastUsedAt: adminApiKeys.lastUsedAt,
			usageCount: adminApiKeys.usageCount,
			rateLimit: adminApiKeys.rateLimit,
			allowedIps: adminApiKeys.allowedIps,
			createdAt: adminApiKeys.createdAt,
		})
		.from(adminApiKeys)
		.where(eq(adminApiKeys.workspaceId, workspace.id))
		.orderBy(desc(adminApiKeys.createdAt))
}

export async function createAdminApiKey(data: {
	name: string
	description?: string
	permissions?: Partial<ApiKeyPermissions>
	environment?: "live" | "test"
	expiresInDays?: number
	rateLimit?: string // Format: "1000/hour"
	allowedIps?: string[]
}) {
	const workspace = await requireAdminApiPermission()
	const userId = await getCurrentUserId()

	// Merge permissions with defaults
	const permissions: ApiKeyPermissions = {
		...DEFAULT_API_KEY_PERMISSIONS,
		...data.permissions,
	}

	const environment = data.environment || "live"
	const { fullKey, keyPrefix, keyHash } = generateApiKey(environment)

	// Calculate expiration if provided
	let expiresAt: Date | null = null
	if (data.expiresInDays) {
		expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)
	}

	const [apiKey] = await db
		.insert(adminApiKeys)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description || null,
			keyPrefix,
			keyHash,
			permissions,
			environment,
			expiresAt,
			rateLimit: data.rateLimit || "1000/hour",
			allowedIps: data.allowedIps || [],
			createdBy: userId,
		})
		.returning()

	// Return the full key ONCE - it won't be retrievable again
	return {
		...apiKey,
		fullKey,
	}
}

export async function updateAdminApiKey(
	id: string,
	data: {
		name?: string
		description?: string
		permissions?: Partial<ApiKeyPermissions>
		isActive?: boolean
		rateLimit?: string
		allowedIps?: string[]
	}
) {
	const workspace = await requireAdminApiPermission()

	// Get existing key to merge permissions
	const [existing] = await db
		.select()
		.from(adminApiKeys)
		.where(and(eq(adminApiKeys.id, id), eq(adminApiKeys.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) {
		throw new Error("API key not found")
	}

	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
	}

	if (data.name !== undefined) {
		updateData.name = data.name
	}
	if (data.description !== undefined) {
		updateData.description = data.description
	}
	if (data.permissions !== undefined) {
		updateData.permissions = {
			...(existing.permissions as ApiKeyPermissions),
			...data.permissions,
		}
	}
	if (data.isActive !== undefined) {
		updateData.isActive = data.isActive
	}
	if (data.rateLimit !== undefined) {
		updateData.rateLimit = data.rateLimit
	}
	if (data.allowedIps !== undefined) {
		updateData.allowedIps = data.allowedIps
	}

	await db
		.update(adminApiKeys)
		.set(updateData)
		.where(and(eq(adminApiKeys.id, id), eq(adminApiKeys.workspaceId, workspace.id)))
}

export async function deleteAdminApiKey(id: string) {
	const workspace = await requireAdminApiPermission()

	await db
		.delete(adminApiKeys)
		.where(and(eq(adminApiKeys.id, id), eq(adminApiKeys.workspaceId, workspace.id)))
}

export async function regenerateAdminApiKey(id: string) {
	const workspace = await requireAdminApiPermission()

	// Get existing key
	const [existing] = await db
		.select({ environment: adminApiKeys.environment })
		.from(adminApiKeys)
		.where(and(eq(adminApiKeys.id, id), eq(adminApiKeys.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) {
		throw new Error("API key not found")
	}

	// Generate new key with same environment
	const { fullKey, keyPrefix, keyHash } = generateApiKey(existing.environment as "live" | "test")

	await db
		.update(adminApiKeys)
		.set({
			keyPrefix,
			keyHash,
			usageCount: "0", // Reset usage count
			lastUsedAt: null, // Reset last used
			updatedAt: new Date(),
		})
		.where(and(eq(adminApiKeys.id, id), eq(adminApiKeys.workspaceId, workspace.id)))

	return { fullKey, keyPrefix }
}

