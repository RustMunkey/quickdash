/**
 * Admin API - Discounts
 *
 * GET /api/v1/discounts - List discounts
 * POST /api/v1/discounts - Create discount
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, or, ilike, desc, asc, count } from "@quickdash/db/drizzle"
import { discounts } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"
import { nanoid } from "nanoid"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readMarketing")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const isActive = searchParams.get("is_active")
	const search = searchParams.get("search")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(discounts.workspaceId, auth.workspace.id)]

		if (isActive !== null && isActive !== undefined && isActive !== "") {
			conditions.push(eq(discounts.isActive, isActive === "true"))
		}
		if (search) {
			conditions.push(
				or(
					ilike(discounts.name, `%${search}%`),
					ilike(discounts.code, `%${search}%`)
				)!
			)
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(discounts)
			.where(and(...conditions))

		// Get discounts
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "name"
				? discounts.name
				: sortBy === "value"
					? discounts.value
					: sortBy === "expiresAt"
						? discounts.expiresAt
						: discounts.createdAt

		const discountList = await db
			.select()
			.from(discounts)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: discountList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List discounts error:", error)
		return apiError("Failed to list discounts", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeMarketing")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		// Validate required fields
		if (!body.name || typeof body.name !== "string") {
			return apiError("Discount name is required", "VALIDATION_ERROR", 400)
		}
		if (!body.valueType || !["percentage", "fixed"].includes(body.valueType)) {
			return apiError("valueType is required and must be 'percentage' or 'fixed'", "VALIDATION_ERROR", 400)
		}
		if (body.value === undefined || body.value === null) {
			return apiError("Discount value is required", "VALIDATION_ERROR", 400)
		}

		// Auto-generate code if not provided
		const code = body.code || nanoid(10).toUpperCase()

		// Check for duplicate code
		const [existingCode] = await db
			.select({ id: discounts.id })
			.from(discounts)
			.where(eq(discounts.code, code))
			.limit(1)

		if (existingCode) {
			return apiError("A discount with this code already exists", "CONFLICT", 409)
		}

		const [discount] = await db
			.insert(discounts)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				code,
				discountType: body.discountType || null,
				valueType: body.valueType,
				value: String(body.value),
				minimumOrderAmount: body.minimumOrderAmount ? String(body.minimumOrderAmount) : null,
				maxUses: body.maxUses ?? null,
				maxUsesPerUser: body.maxUsesPerUser ?? 1,
				applicableCategories: body.applicableCategories || null,
				isActive: body.isActive !== false,
				isStackable: body.isStackable || false,
				startsAt: body.startsAt ? new Date(body.startsAt) : null,
				expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
			})
			.returning()

		return apiSuccess({ data: discount }, 201)
	} catch (error) {
		console.error("Admin API - Create discount error:", error)
		return apiError("Failed to create discount", "INTERNAL_ERROR", 500)
	}
}
