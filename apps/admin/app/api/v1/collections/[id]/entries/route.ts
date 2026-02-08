/**
 * Admin API - Collection Entries
 *
 * GET /api/v1/collections/:id/entries - List entries for a collection
 * POST /api/v1/collections/:id/entries - Create entry in a collection
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count, sql } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const search = searchParams.get("search")
	const active = searchParams.get("active")
	const sortBy = searchParams.get("sort_by") || "sortOrder"
	const sortOrder = searchParams.get("sort_order") || "asc"

	try {
		// Verify collection belongs to workspace and get its schema
		const [collection] = await db
			.select({
				id: contentCollections.id,
				schema: contentCollections.schema,
			})
			.from(contentCollections)
			.where(
				and(
					eq(contentCollections.id, id),
					eq(contentCollections.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!collection) {
			return apiError("Collection not found", "NOT_FOUND", 404)
		}

		// Build conditions
		const conditions = [
			eq(contentEntries.collectionId, id),
			eq(contentEntries.workspaceId, auth.workspace.id),
		]

		if (active !== null && active !== undefined) {
			conditions.push(eq(contentEntries.isActive, active === "true"))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(contentEntries)
			.where(and(...conditions))

		// Determine sort column
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "createdAt"
				? contentEntries.createdAt
				: sortBy === "updatedAt"
					? contentEntries.updatedAt
					: contentEntries.sortOrder

		// Build the query - if searching, filter on the titleField in JSONB data
		let entries
		if (search && collection.schema?.settings?.titleField) {
			const titleField = collection.schema.settings.titleField
			entries = await db
				.select()
				.from(contentEntries)
				.where(
					and(
						...conditions,
						sql`${contentEntries.data}->>${titleField} ILIKE ${"%" + search + "%"}`
					)
				)
				.orderBy(orderFn(sortColumn))
				.limit(limit)
				.offset(offset)

			// Recount with search filter
			const [{ filteredTotal }] = await db
				.select({ filteredTotal: count() })
				.from(contentEntries)
				.where(
					and(
						...conditions,
						sql`${contentEntries.data}->>${titleField} ILIKE ${"%" + search + "%"}`
					)
				)

			return apiSuccess({
				data: entries,
				meta: buildPaginationMeta(Number(filteredTotal), page, limit),
			})
		} else {
			entries = await db
				.select()
				.from(contentEntries)
				.where(and(...conditions))
				.orderBy(orderFn(sortColumn))
				.limit(limit)
				.offset(offset)
		}

		return apiSuccess({
			data: entries,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List entries error:", error)
		return apiError("Failed to list entries", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		// Verify collection belongs to workspace
		const [collection] = await db
			.select({ id: contentCollections.id })
			.from(contentCollections)
			.where(
				and(
					eq(contentCollections.id, id),
					eq(contentCollections.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!collection) {
			return apiError("Collection not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		if (!body.data || typeof body.data !== "object") {
			return apiError("Entry data is required and must be an object", "VALIDATION_ERROR", 400)
		}

		const [entry] = await db
			.insert(contentEntries)
			.values({
				collectionId: id,
				workspaceId: auth.workspace.id,
				data: body.data,
				isActive: body.isActive !== false,
				sortOrder: body.sortOrder ?? 0,
			})
			.returning()

		return apiSuccess({ data: entry }, 201)
	} catch (error) {
		console.error("Admin API - Create entry error:", error)
		return apiError("Failed to create entry", "INTERNAL_ERROR", 500)
	}
}
