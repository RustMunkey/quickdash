/**
 * Admin API - Content Collections
 *
 * GET /api/v1/collections - List collections with entry counts
 * POST /api/v1/collections - Create collection
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, ilike, desc, asc, count, sql } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readContent")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const search = searchParams.get("search")
	const active = searchParams.get("active")
	const sortBy = searchParams.get("sort_by") || "sortOrder"
	const sortOrder = searchParams.get("sort_order") || "asc"

	try {
		const conditions = [eq(contentCollections.workspaceId, auth.workspace.id)]

		if (search) {
			conditions.push(ilike(contentCollections.name, `%${search}%`))
		}
		if (active !== null && active !== undefined) {
			conditions.push(eq(contentCollections.isActive, active === "true"))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(contentCollections)
			.where(and(...conditions))

		// Get collections with entry counts
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "name"
				? contentCollections.name
				: sortBy === "createdAt"
					? contentCollections.createdAt
					: sortBy === "updatedAt"
						? contentCollections.updatedAt
						: contentCollections.sortOrder

		const collections = await db
			.select({
				id: contentCollections.id,
				name: contentCollections.name,
				slug: contentCollections.slug,
				description: contentCollections.description,
				icon: contentCollections.icon,
				schema: contentCollections.schema,
				allowPublicSubmit: contentCollections.allowPublicSubmit,
				publicSubmitStatus: contentCollections.publicSubmitStatus,
				isActive: contentCollections.isActive,
				sortOrder: contentCollections.sortOrder,
				createdAt: contentCollections.createdAt,
				updatedAt: contentCollections.updatedAt,
				entryCount: sql<number>`COUNT(${contentEntries.id})::int`.as("entry_count"),
			})
			.from(contentCollections)
			.leftJoin(contentEntries, eq(contentCollections.id, contentEntries.collectionId))
			.where(and(...conditions))
			.groupBy(contentCollections.id)
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: collections,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List collections error:", error)
		return apiError("Failed to list collections", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeContent")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.name || typeof body.name !== "string") {
			return apiError("Collection name is required", "VALIDATION_ERROR", 400)
		}
		if (!body.slug || typeof body.slug !== "string") {
			return apiError("Collection slug is required", "VALIDATION_ERROR", 400)
		}
		if (!body.schema || typeof body.schema !== "object") {
			return apiError("Collection schema is required", "VALIDATION_ERROR", 400)
		}

		// Check for duplicate slug
		const [existing] = await db
			.select({ id: contentCollections.id })
			.from(contentCollections)
			.where(
				and(
					eq(contentCollections.workspaceId, auth.workspace.id),
					eq(contentCollections.slug, body.slug)
				)
			)
			.limit(1)

		if (existing) {
			return apiError("A collection with this slug already exists", "CONFLICT", 409)
		}

		const [collection] = await db
			.insert(contentCollections)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				slug: body.slug,
				description: body.description || null,
				icon: body.icon || null,
				schema: body.schema,
				allowPublicSubmit: body.allowPublicSubmit ?? false,
				publicSubmitStatus: body.publicSubmitStatus || "inactive",
				isActive: body.isActive !== false,
				sortOrder: body.sortOrder ?? 0,
			})
			.returning()

		return apiSuccess({ data: collection }, 201)
	} catch (error) {
		console.error("Admin API - Create collection error:", error)
		return apiError("Failed to create collection", "INTERNAL_ERROR", 500)
	}
}
