/**
 * Admin API - Shipping Zone Detail
 *
 * GET /api/v1/shipping/zones/[id] - Get zone with associated rates
 * PATCH /api/v1/shipping/zones/[id] - Update zone
 * DELETE /api/v1/shipping/zones/[id] - Delete zone
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import {
	shippingZones,
	shippingZoneRates,
	shippingRates,
	shippingCarriers,
} from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readShipping")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [zone] = await db
			.select()
			.from(shippingZones)
			.where(
				and(
					eq(shippingZones.id, id),
					eq(shippingZones.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!zone) {
			return apiError("Shipping zone not found", "NOT_FOUND", 404)
		}

		// Get associated rates with carrier and rate details
		const rates = await db
			.select({
				id: shippingZoneRates.id,
				zoneId: shippingZoneRates.zoneId,
				carrierId: shippingZoneRates.carrierId,
				rateId: shippingZoneRates.rateId,
				priceOverride: shippingZoneRates.priceOverride,
				isActive: shippingZoneRates.isActive,
				carrierName: shippingCarriers.name,
				carrierCode: shippingCarriers.code,
				rateName: shippingRates.name,
				rateMinWeight: shippingRates.minWeight,
				rateMaxWeight: shippingRates.maxWeight,
				rateFlatRate: shippingRates.flatRate,
				ratePerKgRate: shippingRates.perKgRate,
				rateEstimatedDays: shippingRates.estimatedDays,
			})
			.from(shippingZoneRates)
			.leftJoin(shippingCarriers, eq(shippingZoneRates.carrierId, shippingCarriers.id))
			.leftJoin(shippingRates, eq(shippingZoneRates.rateId, shippingRates.id))
			.where(eq(shippingZoneRates.zoneId, id))

		return apiSuccess({
			data: {
				...zone,
				rates,
			},
		})
	} catch (error) {
		console.error("Admin API - Get shipping zone error:", error)
		return apiError("Failed to get shipping zone", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeShipping")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify zone exists and belongs to workspace
		const [existing] = await db
			.select({ id: shippingZones.id })
			.from(shippingZones)
			.where(
				and(
					eq(shippingZones.id, id),
					eq(shippingZones.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Shipping zone not found", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}
		if (body.name !== undefined) updates.name = body.name
		if (body.countries !== undefined) updates.countries = body.countries
		if (body.regions !== undefined) updates.regions = body.regions
		if (body.isActive !== undefined) updates.isActive = body.isActive

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		updates.updatedAt = new Date()

		const [zone] = await db
			.update(shippingZones)
			.set(updates)
			.where(eq(shippingZones.id, id))
			.returning()

		return apiSuccess({ data: zone })
	} catch (error) {
		console.error("Admin API - Update shipping zone error:", error)
		return apiError("Failed to update shipping zone", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeShipping")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [existing] = await db
			.select({ id: shippingZones.id })
			.from(shippingZones)
			.where(
				and(
					eq(shippingZones.id, id),
					eq(shippingZones.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Shipping zone not found", "NOT_FOUND", 404)
		}

		await db.delete(shippingZones).where(eq(shippingZones.id, id))

		return apiSuccess({ data: { id, deleted: true } })
	} catch (error) {
		console.error("Admin API - Delete shipping zone error:", error)
		return apiError("Failed to delete shipping zone", "INTERNAL_ERROR", 500)
	}
}
