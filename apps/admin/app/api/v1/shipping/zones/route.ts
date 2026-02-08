/**
 * Admin API - Shipping Zones
 *
 * GET /api/v1/shipping/zones - List shipping zones
 * POST /api/v1/shipping/zones - Create shipping zone
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count } from "@quickdash/db/drizzle"
import { shippingZones } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readShipping")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(shippingZones.workspaceId, auth.workspace.id)]

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(shippingZones)
			.where(and(...conditions))

		// Get zones
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "name"
				? shippingZones.name
				: shippingZones.createdAt

		const zoneList = await db
			.select()
			.from(shippingZones)
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: zoneList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List shipping zones error:", error)
		return apiError("Failed to list shipping zones", "INTERNAL_ERROR", 500)
	}
}

export async function POST(request: NextRequest) {
	const auth = await authenticateAdminApi("writeShipping")
	if (!auth.success) return auth.response

	try {
		const body = await request.json()

		if (!body.name || typeof body.name !== "string") {
			return apiError("Zone name is required", "VALIDATION_ERROR", 400)
		}

		const [zone] = await db
			.insert(shippingZones)
			.values({
				workspaceId: auth.workspace.id,
				name: body.name,
				countries: body.countries || [],
				regions: body.regions || [],
				isActive: body.isActive !== false,
			})
			.returning()

		return apiSuccess({ data: zone }, 201)
	} catch (error) {
		console.error("Admin API - Create shipping zone error:", error)
		return apiError("Failed to create shipping zone", "INTERNAL_ERROR", 500)
	}
}
