/**
 * Admin API - Single API Key
 *
 * GET /api/v1/api-keys/:id - Get API key details
 * PATCH /api/v1/api-keys/:id - Update API key
 * DELETE /api/v1/api-keys/:id - Revoke API key
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { adminApiKeys, users, userWorkspacePreferences, workspaceMembers } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

interface RouteParams {
	params: Promise<{ id: string }>
}

// Helper to get workspace from session
async function getWorkspaceFromSession() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) return null

	const [pref] = await db
		.select({ workspaceId: userWorkspacePreferences.activeWorkspaceId })
		.from(userWorkspacePreferences)
		.where(eq(userWorkspacePreferences.userId, session.user.id))
		.limit(1)

	if (!pref?.workspaceId) return null

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

	return { workspaceId: pref.workspaceId, userId: session.user.id }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Get workspace ID from API key or session
	let workspaceId: string

	const apiAuth = await authenticateAdminApi()
	if (apiAuth.success) {
		workspaceId = apiAuth.workspace.id
	} else {
		const sessionAuth = await getWorkspaceFromSession()
		if (!sessionAuth) {
			return apiAuth.response
		}
		workspaceId = sessionAuth.workspaceId
	}

	try {
		// Get API key
		const [apiKey] = await db
			.select({
				id: adminApiKeys.id,
				name: adminApiKeys.name,
				description: adminApiKeys.description,
				keyPrefix: adminApiKeys.keyPrefix,
				permissions: adminApiKeys.permissions,
				environment: adminApiKeys.environment,
				rateLimit: adminApiKeys.rateLimit,
				allowedIps: adminApiKeys.allowedIps,
				isActive: adminApiKeys.isActive,
				lastUsedAt: adminApiKeys.lastUsedAt,
				usageCount: adminApiKeys.usageCount,
				expiresAt: adminApiKeys.expiresAt,
				createdBy: adminApiKeys.createdBy,
				createdByName: users.name,
				createdAt: adminApiKeys.createdAt,
				updatedAt: adminApiKeys.updatedAt,
			})
			.from(adminApiKeys)
			.leftJoin(users, eq(adminApiKeys.createdBy, users.id))
			.where(
				and(
					eq(adminApiKeys.id, id),
					eq(adminApiKeys.workspaceId, workspaceId)
				)
			)
			.limit(1)

		if (!apiKey) {
			return apiError("API key not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: apiKey })
	} catch (error) {
		console.error("Admin API - Get API key error:", error)
		return apiError("Failed to get API key", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Get workspace ID from session (more secure for updating keys)
	const sessionAuth = await getWorkspaceFromSession()
	if (!sessionAuth) {
		return apiError("Sign in required to update API keys", "UNAUTHORIZED", 401)
	}

	try {
		// Verify ownership
		const [existing] = await db
			.select()
			.from(adminApiKeys)
			.where(
				and(
					eq(adminApiKeys.id, id),
					eq(adminApiKeys.workspaceId, sessionAuth.workspaceId)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("API key not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		if (body.name !== undefined) {
			updateData.name = body.name
		}
		if (body.description !== undefined) {
			updateData.description = body.description
		}
		if (body.permissions !== undefined) {
			updateData.permissions = {
				...existing.permissions,
				...body.permissions,
			}
		}
		if (body.rateLimit !== undefined) {
			updateData.rateLimit = body.rateLimit
		}
		if (body.allowedIps !== undefined) {
			updateData.allowedIps = body.allowedIps
		}
		if (body.isActive !== undefined) {
			updateData.isActive = body.isActive
		}
		if (body.expiresAt !== undefined) {
			updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
		}

		// Update API key
		const [updated] = await db
			.update(adminApiKeys)
			.set(updateData)
			.where(eq(adminApiKeys.id, id))
			.returning()

		return apiSuccess({
			data: {
				id: updated.id,
				name: updated.name,
				description: updated.description,
				keyPrefix: updated.keyPrefix,
				permissions: updated.permissions,
				environment: updated.environment,
				rateLimit: updated.rateLimit,
				allowedIps: updated.allowedIps,
				isActive: updated.isActive,
				expiresAt: updated.expiresAt,
				updatedAt: updated.updatedAt,
			},
		})
	} catch (error) {
		console.error("Admin API - Update API key error:", error)
		return apiError("Failed to update API key", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Get workspace ID from session (more secure for deleting keys)
	const sessionAuth = await getWorkspaceFromSession()
	if (!sessionAuth) {
		return apiError("Sign in required to revoke API keys", "UNAUTHORIZED", 401)
	}

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: adminApiKeys.id })
			.from(adminApiKeys)
			.where(
				and(
					eq(adminApiKeys.id, id),
					eq(adminApiKeys.workspaceId, sessionAuth.workspaceId)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("API key not found", "NOT_FOUND", 404)
		}

		// Delete API key
		await db.delete(adminApiKeys).where(eq(adminApiKeys.id, id))

		return apiSuccess({ message: "API key revoked successfully" })
	} catch (error) {
		console.error("Admin API - Delete API key error:", error)
		return apiError("Failed to revoke API key", "INTERNAL_ERROR", 500)
	}
}
