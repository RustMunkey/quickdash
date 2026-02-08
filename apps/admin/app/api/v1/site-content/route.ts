/**
 * Admin API - Site Content (Key-Value Store)
 *
 * GET /api/v1/site-content - List all KV pairs
 * PUT /api/v1/site-content - Upsert KV pair(s)
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql } from "@quickdash/db/drizzle"
import { siteContent } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	try {
		const items = await db
			.select()
			.from(siteContent)
			.where(eq(siteContent.workspaceId, auth.workspace.id))

		return apiSuccess({ data: items })
	} catch (error) {
		console.error("Admin API - List site content error:", error)
		return apiError("Failed to list site content", "INTERNAL_ERROR", 500)
	}
}

export async function PUT(request: NextRequest) {
	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
			return apiError(
				"Request body must include a non-empty 'items' array",
				"VALIDATION_ERROR",
				400
			)
		}

		// Validate each item
		for (const item of body.items) {
			if (!item.key || typeof item.key !== "string") {
				return apiError("Each item must have a 'key' string", "VALIDATION_ERROR", 400)
			}
		}

		const results = []

		for (const item of body.items) {
			// Check if the key already exists for this workspace
			const [existing] = await db
				.select({ id: siteContent.id })
				.from(siteContent)
				.where(
					and(
						eq(siteContent.workspaceId, auth.workspace.id),
						eq(siteContent.key, item.key)
					)
				)
				.limit(1)

			if (existing) {
				// Update existing
				const [updated] = await db
					.update(siteContent)
					.set({
						type: item.type || "text",
						value: item.value ?? null,
						updatedAt: new Date(),
					})
					.where(eq(siteContent.id, existing.id))
					.returning()

				results.push(updated)
			} else {
				// Insert new
				const [created] = await db
					.insert(siteContent)
					.values({
						workspaceId: auth.workspace.id,
						key: item.key,
						type: item.type || "text",
						value: item.value ?? null,
					})
					.returning()

				results.push(created)
			}
		}

		return apiSuccess({ data: results })
	} catch (error) {
		console.error("Admin API - Upsert site content error:", error)
		return apiError("Failed to upsert site content", "INTERNAL_ERROR", 500)
	}
}
