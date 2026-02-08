/**
 * Admin API - API Keys Management
 *
 * GET /api/v1/api-keys - List API keys (requires existing API key or session auth)
 * POST /api/v1/api-keys - Create new API key
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, count } from "@quickdash/db/drizzle"
import { adminApiKeys, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
	generateApiKey,
} from "@/lib/admin-api"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { DEFAULT_API_KEY_PERMISSIONS } from "@quickdash/db/schema"

// Helper to get workspace from session (for initial API key creation)
async function getWorkspaceFromSession() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) return null

	// Get user's active workspace
	const { userWorkspacePreferences, workspaceMembers, workspaces } = await import("@quickdash/db/schema")

	const [pref] = await db
		.select({ workspaceId: userWorkspacePreferences.activeWorkspaceId })
		.from(userWorkspacePreferences)
		.where(eq(userWorkspacePreferences.userId, session.user.id))
		.limit(1)

	if (!pref?.workspaceId) return null

	// Verify user is admin or owner
	const [membership] = await db
		.select({ role: workspaceMembers.role })
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.userId, session.user.id),
				eq(workspaceMembers.workspaceId, pref.workspaceId)
			)
		)
		.limit(1)

	if (!membership || !["owner", "admin"].includes(membership.role)) return null

	// Get workspace info
	const [workspace] = await db
		.select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
		.from(workspaces)
		.where(eq(workspaces.id, pref.workspaceId))
		.limit(1)

	return { workspace, userId: session.user.id }
}

export async function GET(request: NextRequest) {
	// Try API key auth first
	let auth = await authenticateAdminApi("readWebhooks") // Any read permission is fine
	let workspaceId: string
	let canManage = false

	if (auth.success) {
		workspaceId = auth.workspace.id
		canManage = auth.permissions.fullAccess === true
	} else {
		// Fall back to session auth
		const sessionAuth = await getWorkspaceFromSession()
		if (!sessionAuth) {
			return auth.response // Return original auth error
		}
		workspaceId = sessionAuth.workspace.id
		canManage = true
	}

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	try {
		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(adminApiKeys)
			.where(eq(adminApiKeys.workspaceId, workspaceId))

		// Get API keys
		const keys = await db
			.select({
				id: adminApiKeys.id,
				name: adminApiKeys.name,
				description: adminApiKeys.description,
				keyPrefix: adminApiKeys.keyPrefix,
				permissions: adminApiKeys.permissions,
				environment: adminApiKeys.environment,
				rateLimit: adminApiKeys.rateLimit,
				isActive: adminApiKeys.isActive,
				lastUsedAt: adminApiKeys.lastUsedAt,
				expiresAt: adminApiKeys.expiresAt,
				createdBy: adminApiKeys.createdBy,
				createdByName: users.name,
				createdAt: adminApiKeys.createdAt,
			})
			.from(adminApiKeys)
			.leftJoin(users, eq(adminApiKeys.createdBy, users.id))
			.where(eq(adminApiKeys.workspaceId, workspaceId))
			.orderBy(desc(adminApiKeys.createdAt))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: keys,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List API keys error:", error)
		return apiError("Failed to list API keys", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	// For creating API keys, prefer session auth (more secure)
	// But also allow API key auth with fullAccess permission
	let workspaceId: string
	let createdBy: string

	const apiAuth = await authenticateAdminApi()
	if (apiAuth.success && apiAuth.permissions.fullAccess) {
		// API key with full access can create more keys
		workspaceId = apiAuth.workspace.id
		// We need to look up who the key belongs to
		const [keyInfo] = await db
			.select({ createdBy: adminApiKeys.createdBy })
			.from(adminApiKeys)
			.where(eq(adminApiKeys.id, apiAuth.keyId))
			.limit(1)
		createdBy = keyInfo?.createdBy || "system"
	} else {
		// Use session auth
		const sessionAuth = await getWorkspaceFromSession()
		if (!sessionAuth) {
			return apiError(
				"Authentication required",
				"UNAUTHORIZED",
				401,
				{ message: "Sign in to create API keys, or use an API key with full access" }
			)
		}
		workspaceId = sessionAuth.workspace.id
		createdBy = sessionAuth.userId
	}

	try {
		const body = await request.json()

		// Validate required fields
		if (!body.name || typeof body.name !== "string") {
			return apiError("API key name is required", "VALIDATION_ERROR", 400)
		}

		// Generate the key
		const environment = body.environment === "test" ? "test" : "live"
		const { fullKey, keyPrefix, keyHash } = generateApiKey(environment)

		// Merge permissions with defaults
		const permissions = {
			...DEFAULT_API_KEY_PERMISSIONS,
			...(body.permissions || {}),
		}

		// Create API key
		const [apiKey] = await db
			.insert(adminApiKeys)
			.values({
				workspaceId,
				name: body.name,
				description: body.description || null,
				keyPrefix,
				keyHash,
				permissions,
				environment,
				rateLimit: body.rateLimit || "1000/hour",
				allowedIps: body.allowedIps || [],
				expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
				createdBy,
			})
			.returning()

		return apiSuccess({
			data: {
				id: apiKey.id,
				name: apiKey.name,
				description: apiKey.description,
				keyPrefix: apiKey.keyPrefix,
				key: fullKey, // Only shown once!
				permissions: apiKey.permissions,
				environment: apiKey.environment,
				rateLimit: apiKey.rateLimit,
				expiresAt: apiKey.expiresAt,
				createdAt: apiKey.createdAt,
			},
			message: "API key created. Copy the key now - it won't be shown again!",
		}, 201)
	} catch (error) {
		console.error("Admin API - Create API key error:", error)
		return apiError("Failed to create API key", "INTERNAL_ERROR", 500)
	}
}
