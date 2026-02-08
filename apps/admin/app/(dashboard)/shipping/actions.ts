"use server"

import { eq, and, desc, count, sql, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import {
	shippingCarriers,
	shippingRates,
	shippingZones,
	shippingZoneRates,
	shippingLabels,
	shipmentTracking,
	trustedSenders,
	orders,
	storeSettings,
	addresses,
} from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireShippingPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageOrders")
	if (!canManage) {
		throw new Error("You don't have permission to manage shipping")
	}
	return workspace
}

// --- CARRIERS ---

interface GetCarriersParams {
	page?: number
	pageSize?: number
}

export async function getCarriers(params: GetCarriersParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(shippingCarriers.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(shippingCarriers)
			.where(where)
			.orderBy(desc(shippingCarriers.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(shippingCarriers).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getCarrier(id: string) {
	const workspace = await requireWorkspace()

	const [carrier] = await db
		.select()
		.from(shippingCarriers)
		.where(and(eq(shippingCarriers.id, id), eq(shippingCarriers.workspaceId, workspace.id)))
		.limit(1)

	if (!carrier) return null

	const rates = await db
		.select()
		.from(shippingRates)
		.where(eq(shippingRates.carrierId, id))
		.orderBy(shippingRates.name)

	return { ...carrier, rates }
}

export async function createCarrier(data: { name: string; code: string; trackingUrlTemplate?: string }) {
	const workspace = await requireShippingPermission()

	const [carrier] = await db
		.insert(shippingCarriers)
		.values({ ...data, workspaceId: workspace.id })
		.returning()

	await logAudit({
		action: "carrier.created",
		targetType: "carrier",
		targetId: carrier.id,
		metadata: { name: data.name },
	})

	return carrier
}

export async function updateCarrier(id: string, data: { name?: string; code?: string; trackingUrlTemplate?: string; isActive?: boolean }) {
	const workspace = await requireShippingPermission()

	await db
		.update(shippingCarriers)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(shippingCarriers.id, id), eq(shippingCarriers.workspaceId, workspace.id)))

	await logAudit({
		action: "carrier.updated",
		targetType: "carrier",
		targetId: id,
	})
}

export async function deleteCarrier(id: string) {
	const workspace = await requireShippingPermission()

	await db.delete(shippingCarriers).where(and(eq(shippingCarriers.id, id), eq(shippingCarriers.workspaceId, workspace.id)))

	await logAudit({
		action: "carrier.deleted",
		targetType: "carrier",
		targetId: id,
	})
}

export async function bulkDeleteCarriers(ids: string[]) {
	const workspace = await requireShippingPermission()
	await db.delete(shippingCarriers).where(and(inArray(shippingCarriers.id, ids), eq(shippingCarriers.workspaceId, workspace.id)))
}

// --- RATES ---

export async function createRate(data: {
	carrierId: string
	name: string
	minWeight?: string
	maxWeight?: string
	flatRate?: string
	perKgRate?: string
	estimatedDays?: string
}) {
	const workspace = await requireShippingPermission()

	// Verify carrier belongs to this workspace
	const [carrier] = await db
		.select({ id: shippingCarriers.id })
		.from(shippingCarriers)
		.where(and(eq(shippingCarriers.id, data.carrierId), eq(shippingCarriers.workspaceId, workspace.id)))
		.limit(1)

	if (!carrier) throw new Error("Carrier not found")

	const [rate] = await db.insert(shippingRates).values(data).returning()

	await logAudit({
		action: "rate.created",
		targetType: "rate",
		targetId: rate.id,
		metadata: { name: data.name, carrierId: data.carrierId },
	})

	return rate
}

export async function updateRate(id: string, data: {
	name?: string
	minWeight?: string
	maxWeight?: string
	flatRate?: string
	perKgRate?: string
	estimatedDays?: string
	isActive?: boolean
}) {
	const workspace = await requireShippingPermission()

	// Verify rate's carrier belongs to this workspace
	const [rate] = await db
		.select({ id: shippingRates.id })
		.from(shippingRates)
		.innerJoin(shippingCarriers, eq(shippingRates.carrierId, shippingCarriers.id))
		.where(and(eq(shippingRates.id, id), eq(shippingCarriers.workspaceId, workspace.id)))
		.limit(1)

	if (!rate) throw new Error("Rate not found")

	await db.update(shippingRates).set(data).where(eq(shippingRates.id, id))

	await logAudit({
		action: "rate.updated",
		targetType: "rate",
		targetId: id,
	})
}

export async function deleteRate(id: string) {
	const workspace = await requireShippingPermission()

	// Verify rate's carrier belongs to this workspace
	const [rate] = await db
		.select({ id: shippingRates.id })
		.from(shippingRates)
		.innerJoin(shippingCarriers, eq(shippingRates.carrierId, shippingCarriers.id))
		.where(and(eq(shippingRates.id, id), eq(shippingCarriers.workspaceId, workspace.id)))
		.limit(1)

	if (!rate) throw new Error("Rate not found")

	await db.delete(shippingRates).where(eq(shippingRates.id, id))

	await logAudit({
		action: "rate.deleted",
		targetType: "rate",
		targetId: id,
	})
}

// --- ZONES ---

interface GetZonesParams {
	page?: number
	pageSize?: number
}

export async function getZones(params: GetZonesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(shippingZones.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(shippingZones)
			.where(where)
			.orderBy(shippingZones.name)
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(shippingZones).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getZone(id: string) {
	const workspace = await requireWorkspace()

	const [zone] = await db
		.select()
		.from(shippingZones)
		.where(and(eq(shippingZones.id, id), eq(shippingZones.workspaceId, workspace.id)))
		.limit(1)

	if (!zone) return null

	const rates = await db
		.select({
			id: shippingZoneRates.id,
			zoneId: shippingZoneRates.zoneId,
			carrierId: shippingZoneRates.carrierId,
			rateId: shippingZoneRates.rateId,
			priceOverride: shippingZoneRates.priceOverride,
			isActive: shippingZoneRates.isActive,
			carrierName: shippingCarriers.name,
			rateName: shippingRates.name,
			flatRate: shippingRates.flatRate,
			estimatedDays: shippingRates.estimatedDays,
		})
		.from(shippingZoneRates)
		.innerJoin(shippingCarriers, eq(shippingZoneRates.carrierId, shippingCarriers.id))
		.innerJoin(shippingRates, eq(shippingZoneRates.rateId, shippingRates.id))
		.where(eq(shippingZoneRates.zoneId, id))

	return { ...zone, rates }
}

export async function createZone(data: { name: string; countries?: string[]; regions?: string[] }) {
	const workspace = await requireShippingPermission()

	const [zone] = await db.insert(shippingZones).values({ ...data, workspaceId: workspace.id }).returning()

	await logAudit({
		action: "zone.created",
		targetType: "zone",
		targetId: zone.id,
		metadata: { name: data.name },
	})

	return zone
}

export async function updateZone(id: string, data: { name?: string; countries?: string[]; regions?: string[]; isActive?: boolean }) {
	const workspace = await requireShippingPermission()

	await db
		.update(shippingZones)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(shippingZones.id, id), eq(shippingZones.workspaceId, workspace.id)))

	await logAudit({
		action: "zone.updated",
		targetType: "zone",
		targetId: id,
	})
}

export async function deleteZone(id: string) {
	const workspace = await requireShippingPermission()

	await db.delete(shippingZones).where(and(eq(shippingZones.id, id), eq(shippingZones.workspaceId, workspace.id)))

	await logAudit({
		action: "zone.deleted",
		targetType: "zone",
		targetId: id,
	})
}

export async function bulkDeleteZones(ids: string[]) {
	const workspace = await requireShippingPermission()
	await db.delete(shippingZones).where(and(inArray(shippingZones.id, ids), eq(shippingZones.workspaceId, workspace.id)))
}

export async function addZoneRate(data: { zoneId: string; carrierId: string; rateId: string; priceOverride?: string }) {
	const workspace = await requireShippingPermission()

	// Verify zone and carrier belong to this workspace
	const [zone] = await db
		.select({ id: shippingZones.id })
		.from(shippingZones)
		.where(and(eq(shippingZones.id, data.zoneId), eq(shippingZones.workspaceId, workspace.id)))
		.limit(1)

	const [carrier] = await db
		.select({ id: shippingCarriers.id })
		.from(shippingCarriers)
		.where(and(eq(shippingCarriers.id, data.carrierId), eq(shippingCarriers.workspaceId, workspace.id)))
		.limit(1)

	if (!zone || !carrier) throw new Error("Zone or carrier not found")

	const [zr] = await db.insert(shippingZoneRates).values(data).returning()

	await logAudit({
		action: "zone_rate.created",
		targetType: "zone_rate",
		targetId: zr.id,
	})

	return zr
}

export async function removeZoneRate(id: string) {
	const workspace = await requireShippingPermission()

	// Verify zone rate's zone belongs to this workspace
	const [zr] = await db
		.select({ id: shippingZoneRates.id })
		.from(shippingZoneRates)
		.innerJoin(shippingZones, eq(shippingZoneRates.zoneId, shippingZones.id))
		.where(and(eq(shippingZoneRates.id, id), eq(shippingZones.workspaceId, workspace.id)))
		.limit(1)

	if (!zr) throw new Error("Zone rate not found")

	await db.delete(shippingZoneRates).where(eq(shippingZoneRates.id, id))

	await logAudit({
		action: "zone_rate.deleted",
		targetType: "zone_rate",
		targetId: id,
	})
}

// --- LABELS ---

interface GetLabelsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getLabels(params: GetLabelsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Filter by workspace through orders
	const conditions = [eq(orders.workspaceId, workspace.id)]
	if (status) {
		conditions.push(eq(shippingLabels.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: shippingLabels.id,
				orderId: shippingLabels.orderId,
				carrierId: shippingLabels.carrierId,
				trackingNumber: shippingLabels.trackingNumber,
				labelUrl: shippingLabels.labelUrl,
				status: shippingLabels.status,
				weight: shippingLabels.weight,
				cost: shippingLabels.cost,
				createdAt: shippingLabels.createdAt,
				carrierName: shippingCarriers.name,
				orderNumber: orders.orderNumber,
			})
			.from(shippingLabels)
			.innerJoin(shippingCarriers, eq(shippingLabels.carrierId, shippingCarriers.id))
			.innerJoin(orders, eq(shippingLabels.orderId, orders.id))
			.where(where)
			.orderBy(desc(shippingLabels.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(shippingLabels)
			.innerJoin(orders, eq(shippingLabels.orderId, orders.id))
			.where(where),
	])

	return { items, totalCount: total.count }
}

export async function getLabel(id: string) {
	const workspace = await requireWorkspace()

	const [label] = await db
		.select({
			id: shippingLabels.id,
			orderId: shippingLabels.orderId,
			carrierId: shippingLabels.carrierId,
			trackingNumber: shippingLabels.trackingNumber,
			labelUrl: shippingLabels.labelUrl,
			status: shippingLabels.status,
			weight: shippingLabels.weight,
			dimensions: shippingLabels.dimensions,
			cost: shippingLabels.cost,
			createdAt: shippingLabels.createdAt,
			carrierName: shippingCarriers.name,
			orderNumber: orders.orderNumber,
		})
		.from(shippingLabels)
		.innerJoin(shippingCarriers, eq(shippingLabels.carrierId, shippingCarriers.id))
		.innerJoin(orders, eq(shippingLabels.orderId, orders.id))
		.where(and(eq(shippingLabels.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	return label ?? null
}

export async function updateLabelStatus(id: string, status: string) {
	const workspace = await requireShippingPermission()

	// Verify label's order belongs to this workspace
	const [label] = await db
		.select({ id: shippingLabels.id })
		.from(shippingLabels)
		.innerJoin(orders, eq(shippingLabels.orderId, orders.id))
		.where(and(eq(shippingLabels.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!label) throw new Error("Label not found")

	await db
		.update(shippingLabels)
		.set({ status })
		.where(eq(shippingLabels.id, id))

	await logAudit({
		action: `label.${status}`,
		targetType: "label",
		targetId: id,
	})
}

export async function bulkDeleteLabels(ids: string[]) {
	const workspace = await requireShippingPermission()
	const items = await db
		.select({ id: shippingLabels.id })
		.from(shippingLabels)
		.innerJoin(orders, eq(shippingLabels.orderId, orders.id))
		.where(and(inArray(shippingLabels.id, ids), eq(orders.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(shippingLabels).where(inArray(shippingLabels.id, validIds))
	}
}

// --- TRACKING ---

interface GetTrackingParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getTracking(params: GetTrackingParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Filter by workspace through orders
	const conditions = [eq(orders.workspaceId, workspace.id)]
	if (status) {
		conditions.push(eq(shipmentTracking.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: shipmentTracking.id,
				orderId: shipmentTracking.orderId,
				carrierId: shipmentTracking.carrierId,
				trackingNumber: shipmentTracking.trackingNumber,
				status: shipmentTracking.status,
				estimatedDelivery: shipmentTracking.estimatedDelivery,
				lastUpdatedAt: shipmentTracking.lastUpdatedAt,
				createdAt: shipmentTracking.createdAt,
				carrierName: shippingCarriers.name,
				orderNumber: orders.orderNumber,
			})
			.from(shipmentTracking)
			.innerJoin(shippingCarriers, eq(shipmentTracking.carrierId, shippingCarriers.id))
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(where)
			.orderBy(desc(shipmentTracking.lastUpdatedAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(shipmentTracking)
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(where),
	])

	return { items, totalCount: total.count }
}

export async function getTrackingDetail(id: string) {
	const workspace = await requireWorkspace()

	const [item] = await db
		.select({
			id: shipmentTracking.id,
			orderId: shipmentTracking.orderId,
			carrierId: shipmentTracking.carrierId,
			trackingNumber: shipmentTracking.trackingNumber,
			status: shipmentTracking.status,
			statusHistory: shipmentTracking.statusHistory,
			estimatedDelivery: shipmentTracking.estimatedDelivery,
			lastUpdatedAt: shipmentTracking.lastUpdatedAt,
			createdAt: shipmentTracking.createdAt,
			carrierName: shippingCarriers.name,
			orderNumber: orders.orderNumber,
		})
		.from(shipmentTracking)
		.innerJoin(shippingCarriers, eq(shipmentTracking.carrierId, shippingCarriers.id))
		.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
		.where(and(eq(shipmentTracking.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	return item ?? null
}

export async function getTrackingByOrderId(orderId: string) {
	const workspace = await requireWorkspace()

	// Verify order belongs to this workspace
	const [order] = await db
		.select({ id: orders.id })
		.from(orders)
		.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) return null

	const [item] = await db
		.select({
			id: shipmentTracking.id,
			orderId: shipmentTracking.orderId,
			carrierId: shipmentTracking.carrierId,
			trackingNumber: shipmentTracking.trackingNumber,
			status: shipmentTracking.status,
			statusHistory: shipmentTracking.statusHistory,
			estimatedDelivery: shipmentTracking.estimatedDelivery,
			lastUpdatedAt: shipmentTracking.lastUpdatedAt,
			createdAt: shipmentTracking.createdAt,
			carrierName: shippingCarriers.name,
		})
		.from(shipmentTracking)
		.innerJoin(shippingCarriers, eq(shipmentTracking.carrierId, shippingCarriers.id))
		.where(eq(shipmentTracking.orderId, orderId))
		.orderBy(desc(shipmentTracking.createdAt))
		.limit(1)

	return item ?? null
}

export async function bulkDeleteTrackingEvents(ids: string[]) {
	const workspace = await requireShippingPermission()
	const items = await db
		.select({ id: shipmentTracking.id })
		.from(shipmentTracking)
		.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
		.where(and(inArray(shipmentTracking.id, ids), eq(orders.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(shipmentTracking).where(inArray(shipmentTracking.id, validIds))
	}
}

// --- REVIEW QUEUE ---

interface GetPendingTrackingParams {
	page?: number
	pageSize?: number
}

export async function getPendingTracking(params: GetPendingTrackingParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	// Filter by workspace - tracking with orders in this workspace OR tracking without orders but with carriers in this workspace
	const whereCondition = and(
		eq(shipmentTracking.reviewStatus, "pending_review"),
		eq(orders.workspaceId, workspace.id)
	)

	const [rawItems, [total]] = await Promise.all([
		db
			.select({
				id: shipmentTracking.id,
				trackingNumber: shipmentTracking.trackingNumber,
				status: shipmentTracking.status,
				source: shipmentTracking.source,
				sourceDetails: shipmentTracking.sourceDetails,
				createdAt: shipmentTracking.createdAt,
				orderId: orders.id,
				orderNumber: orders.orderNumber,
				carrierId: shippingCarriers.id,
				carrierName: shippingCarriers.name,
				carrierCode: shippingCarriers.code,
			})
			.from(shipmentTracking)
			.leftJoin(shippingCarriers, eq(shipmentTracking.carrierId, shippingCarriers.id))
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(whereCondition)
			.orderBy(desc(shipmentTracking.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(shipmentTracking)
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(whereCondition),
	])

	// Transform to expected shape
	const items = rawItems.map((item) => ({
		id: item.id,
		trackingNumber: item.trackingNumber,
		status: item.status,
		source: item.source,
		sourceDetails: item.sourceDetails,
		createdAt: item.createdAt,
		order: item.orderId
			? {
					id: item.orderId,
					orderNumber: item.orderNumber || "",
					customerName: null as string | null,
				}
			: null,
		carrier: item.carrierId
			? {
					id: item.carrierId,
					name: item.carrierName || "",
					code: item.carrierCode || "",
				}
			: null,
	}))

	return { items, totalCount: total.count }
}

export async function approveTracking(id: string) {
	try {
		const workspace = await requireShippingPermission()

		// Get tracking details with workspace verification
		const [tracking] = await db
			.select({
				id: shipmentTracking.id,
				orderId: shipmentTracking.orderId,
				carrierId: shipmentTracking.carrierId,
				trackingNumber: shipmentTracking.trackingNumber,
			})
			.from(shipmentTracking)
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(and(eq(shipmentTracking.id, id), eq(orders.workspaceId, workspace.id)))
			.limit(1)

		if (!tracking) {
			return { success: false, error: "Tracking not found" }
		}

		if (!tracking.orderId) {
			return { success: false, error: "No order associated with this tracking" }
		}

		// Update review status
		await db
			.update(shipmentTracking)
			.set({ reviewStatus: "approved", lastUpdatedAt: new Date() })
			.where(eq(shipmentTracking.id, id))

		// Get carrier for tracking URL
		const [carrier] = await db
			.select()
			.from(shippingCarriers)
			.where(eq(shippingCarriers.id, tracking.carrierId))
			.limit(1)

		// Update order with tracking info
		const trackingUrl = carrier?.trackingUrlTemplate
			? carrier.trackingUrlTemplate.replace("{tracking}", tracking.trackingNumber)
			: null

		await db
			.update(orders)
			.set({
				trackingNumber: tracking.trackingNumber,
				trackingUrl,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, tracking.orderId))

		await logAudit({
			action: "tracking.approved",
			targetType: "tracking",
			targetId: id,
		})

		return { success: true }
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to approve tracking" }
	}
}

export async function rejectTracking(id: string) {
	try {
		const workspace = await requireShippingPermission()

		// Verify tracking belongs to an order in this workspace
		const [tracking] = await db
			.select({ id: shipmentTracking.id })
			.from(shipmentTracking)
			.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
			.where(and(eq(shipmentTracking.id, id), eq(orders.workspaceId, workspace.id)))
			.limit(1)

		if (!tracking) {
			return { success: false, error: "Tracking not found" }
		}

		// Delete the tracking record instead of just marking rejected
		await db.delete(shipmentTracking).where(eq(shipmentTracking.id, id))

		await logAudit({
			action: "tracking.rejected",
			targetType: "tracking",
			targetId: id,
		})

		return { success: true }
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to reject tracking" }
	}
}

export async function updateTrackingOrder(id: string, orderId: string) {
	try {
		const workspace = await requireShippingPermission()

		// Verify order exists and belongs to this workspace
		const [order] = await db
			.select({ id: orders.id })
			.from(orders)
			.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
			.limit(1)

		if (!order) {
			return { success: false, error: "Order not found" }
		}

		// Update tracking record
		await db
			.update(shipmentTracking)
			.set({ orderId, lastUpdatedAt: new Date() })
			.where(eq(shipmentTracking.id, id))

		// Get tracking details
		const [tracking] = await db
			.select()
			.from(shipmentTracking)
			.where(eq(shipmentTracking.id, id))
			.limit(1)

		if (tracking) {
			// Get carrier for tracking URL
			const [carrier] = await db
				.select()
				.from(shippingCarriers)
				.where(eq(shippingCarriers.id, tracking.carrierId))
				.limit(1)

			// Update order with tracking
			const trackingUrl = carrier?.trackingUrlTemplate
				? carrier.trackingUrlTemplate.replace("{tracking}", tracking.trackingNumber)
				: null

			await db
				.update(orders)
				.set({
					trackingNumber: tracking.trackingNumber,
					trackingUrl,
					updatedAt: new Date(),
				})
				.where(eq(orders.id, orderId))
		}

		await logAudit({
			action: "tracking.order_updated",
			targetType: "tracking",
			targetId: id,
			metadata: { orderId },
		})

		return { success: true }
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to update tracking" }
	}
}

export async function bulkRejectPendingTracking(ids: string[]) {
	const workspace = await requireShippingPermission()
	const items = await db
		.select({ id: shipmentTracking.id })
		.from(shipmentTracking)
		.innerJoin(orders, eq(shipmentTracking.orderId, orders.id))
		.where(and(inArray(shipmentTracking.id, ids), eq(orders.workspaceId, workspace.id)))
	const validIds = items.map((i) => i.id)
	if (validIds.length > 0) {
		await db.delete(shipmentTracking).where(inArray(shipmentTracking.id, validIds))
	}
}

// --- TRUSTED SENDERS ---

export async function getTrustedSenders() {
	const workspace = await requireWorkspace()
	return db
		.select()
		.from(trustedSenders)
		.where(eq(trustedSenders.workspaceId, workspace.id))
		.orderBy(trustedSenders.email)
}

export async function addTrustedSender(email: string, name?: string) {
	const workspace = await requireShippingPermission()

	const [sender] = await db
		.insert(trustedSenders)
		.values({ email: email.toLowerCase(), name, workspaceId: workspace.id })
		.onConflictDoUpdate({
			target: [trustedSenders.email, trustedSenders.workspaceId],
			set: { name, autoApprove: true },
		})
		.returning()

	await logAudit({
		action: "trusted_sender.created",
		targetType: "trusted_sender",
		targetId: sender.id,
		metadata: { email },
	})

	return sender
}

export async function removeTrustedSender(id: string) {
	const workspace = await requireShippingPermission()

	await db.delete(trustedSenders).where(and(eq(trustedSenders.id, id), eq(trustedSenders.workspaceId, workspace.id)))

	await logAudit({
		action: "trusted_sender.deleted",
		targetType: "trusted_sender",
		targetId: id,
	})
}

export async function isTrustedSender(email: string, workspaceId: string): Promise<boolean> {
	const [sender] = await db
		.select()
		.from(trustedSenders)
		.where(and(
			eq(trustedSenders.email, email.toLowerCase()),
			eq(trustedSenders.workspaceId, workspaceId),
			eq(trustedSenders.autoApprove, true)
		))
		.limit(1)

	return !!sender
}

// ============================================
// SHIPPO LABEL GENERATION
// ============================================

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY
const SHIPPO_API_URL = "https://api.goshippo.com"

interface ShippoAddress {
	name: string
	company?: string
	street1: string
	street2?: string
	city: string
	state: string
	zip: string
	country: string
	phone?: string
	email?: string
}

interface ShippoParcel {
	length: string
	width: string
	height: string
	distance_unit: "in" | "cm"
	weight: string
	mass_unit: "lb" | "kg" | "oz" | "g"
}

interface ShippoRate {
	object_id: string
	provider: string
	servicelevel: { name: string; token: string }
	amount: string
	currency: string
	estimated_days: number
	duration_terms: string
}

interface ShippoShipment {
	object_id: string
	status: string
	address_from: ShippoAddress
	address_to: ShippoAddress
	parcels: ShippoParcel[]
	rates: ShippoRate[]
}

interface ShippoTransaction {
	object_id: string
	status: "SUCCESS" | "QUEUED" | "WAITING" | "ERROR"
	tracking_number?: string
	label_url?: string
	tracking_url_provider?: string
	rate: string
	messages?: Array<{ text: string }>
}

async function shippoRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	if (!SHIPPO_API_KEY) {
		throw new Error("SHIPPO_API_KEY is not configured")
	}

	const response = await fetch(`${SHIPPO_API_URL}${endpoint}`, {
		...options,
		headers: {
			"Authorization": `ShippoToken ${SHIPPO_API_KEY}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`Shippo API error: ${response.status} ${error}`)
	}

	return response.json()
}

/**
 * Get the ship-from address from workspace settings
 */
async function getShipFromAddress(workspaceId: string): Promise<ShippoAddress | null> {
	const settings = await db
		.select()
		.from(storeSettings)
		.where(and(
			eq(storeSettings.workspaceId, workspaceId),
			eq(storeSettings.group, "shipping")
		))

	const getValue = (key: string) => settings.find(s => s.key === key)?.value || ""

	const street1 = getValue("ship_from_street1")
	const city = getValue("ship_from_city")
	const state = getValue("ship_from_state")
	const zip = getValue("ship_from_zip")
	const country = getValue("ship_from_country")

	// Validate required fields
	if (!street1 || !city || !state || !zip || !country) {
		return null
	}

	return {
		name: getValue("ship_from_name") || getValue("ship_from_company"),
		company: getValue("ship_from_company") || undefined,
		street1,
		street2: getValue("ship_from_street2") || undefined,
		city,
		state,
		zip,
		country,
		phone: getValue("ship_from_phone") || undefined,
		email: getValue("ship_from_email") || undefined,
	}
}

/**
 * Get shipping rates for an order
 */
export async function getShippingRates(orderId: string): Promise<{ success: boolean; rates?: ShippoRate[]; shipmentId?: string; error?: string }> {
	try {
		const workspace = await requireWorkspace()

		// Get order with shipping address
		const [result] = await db
			.select({
				order: orders,
				address: addresses,
			})
			.from(orders)
			.leftJoin(addresses, eq(orders.shippingAddressId, addresses.id))
			.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
			.limit(1)

		if (!result?.order) {
			return { success: false, error: "Order not found" }
		}

		const order = result.order
		const shippingAddress = result.address

		if (!shippingAddress?.addressLine1 || !shippingAddress?.city) {
			return { success: false, error: "Order has no shipping address" }
		}

		// Get ship-from address from settings
		const fromAddress = await getShipFromAddress(workspace.id)
		if (!fromAddress) {
			return { success: false, error: "Ship-from address not configured. Please set it in Settings > Shipping." }
		}

		// Get shipping preferences
		const settings = await db
			.select()
			.from(storeSettings)
			.where(and(
				eq(storeSettings.workspaceId, workspace.id),
				eq(storeSettings.group, "shipping")
			))

		const getValue = (key: string, defaultVal: string) => settings.find(s => s.key === key)?.value || defaultVal
		const weightUnit = getValue("ship_weight_unit", "lb") as "lb" | "kg" | "oz" | "g"
		const dimensionUnit = getValue("ship_dimension_unit", "in") as "in" | "cm"
		const defaultWeight = getValue("ship_default_weight", "1")

		// Create shipment to get rates
		const shipment = await shippoRequest<ShippoShipment>("/shipments", {
			method: "POST",
			body: JSON.stringify({
				address_from: fromAddress,
				address_to: {
					name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() || "Customer",
					company: shippingAddress.company || undefined,
					street1: shippingAddress.addressLine1,
					street2: shippingAddress.addressLine2 || "",
					city: shippingAddress.city,
					state: shippingAddress.state || "",
					zip: shippingAddress.postalCode || "",
					country: shippingAddress.country || "US",
					phone: shippingAddress.phone || "",
				},
				parcels: [{
					length: "10",
					width: "8",
					height: "4",
					distance_unit: dimensionUnit,
					weight: defaultWeight,
					mass_unit: weightUnit,
				}],
				async: false,
			}),
		})

		return {
			success: true,
			rates: shipment.rates,
			shipmentId: shipment.object_id,
		}
	} catch (error) {
		console.error("[Shippo] Error getting rates:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to get shipping rates" }
	}
}

/**
 * Purchase a shipping label
 */
export async function purchaseShippingLabel(
	orderId: string,
	rateId: string,
	shipmentId: string
): Promise<{ success: boolean; label?: { trackingNumber: string; labelUrl: string; trackingUrl?: string }; error?: string }> {
	try {
		const workspace = await requireShippingPermission()

		// Verify order belongs to workspace
		const [order] = await db
			.select()
			.from(orders)
			.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
			.limit(1)

		if (!order) {
			return { success: false, error: "Order not found" }
		}

		// Get label preferences
		const settings = await db
			.select()
			.from(storeSettings)
			.where(and(
				eq(storeSettings.workspaceId, workspace.id),
				eq(storeSettings.group, "shipping")
			))

		const getValue = (key: string, defaultVal: string) => settings.find(s => s.key === key)?.value || defaultVal
		const labelFormat = getValue("ship_label_format", "PDF")

		// Purchase the label
		const transaction = await shippoRequest<ShippoTransaction>("/transactions", {
			method: "POST",
			body: JSON.stringify({
				rate: rateId,
				label_file_type: labelFormat,
				async: false,
			}),
		})

		if (transaction.status !== "SUCCESS") {
			const errorMsg = transaction.messages?.map(m => m.text).join(", ") || "Label purchase failed"
			return { success: false, error: errorMsg }
		}

		if (!transaction.tracking_number || !transaction.label_url) {
			return { success: false, error: "Label created but missing tracking number or URL" }
		}

		// Update order with tracking info
		await db
			.update(orders)
			.set({
				trackingNumber: transaction.tracking_number,
				trackingUrl: transaction.tracking_url_provider || null,
				status: order.status === "processing" ? "shipped" : order.status,
				updatedAt: new Date(),
			})
			.where(eq(orders.id, orderId))

		// Find or create Shippo carrier for this workspace
		let [shippoCarrier] = await db
			.select()
			.from(shippingCarriers)
			.where(and(
				eq(shippingCarriers.workspaceId, workspace.id),
				eq(shippingCarriers.code, "shippo")
			))
			.limit(1)

		if (!shippoCarrier) {
			[shippoCarrier] = await db
				.insert(shippingCarriers)
				.values({
					workspaceId: workspace.id,
					name: "Shippo",
					code: "shippo",
					trackingUrlTemplate: "https://track.goshippo.com/{tracking}",
				})
				.returning()
		}

		// Create shipping label record
		await db.insert(shippingLabels).values({
			orderId: order.id,
			carrierId: shippoCarrier.id,
			trackingNumber: transaction.tracking_number,
			labelUrl: transaction.label_url,
			status: "created",
		})

		// Create tracking record
		await db.insert(shipmentTracking).values({
			orderId: order.id,
			carrierId: shippoCarrier.id,
			trackingNumber: transaction.tracking_number,
			status: "pending",
			source: "shippo",
			reviewStatus: "approved",
		})

		await logAudit({
			action: "label.purchased",
			targetType: "order",
			targetId: orderId,
			metadata: { trackingNumber: transaction.tracking_number },
		})

		return {
			success: true,
			label: {
				trackingNumber: transaction.tracking_number,
				labelUrl: transaction.label_url,
				trackingUrl: transaction.tracking_url_provider,
			},
		}
	} catch (error) {
		console.error("[Shippo] Error purchasing label:", error)
		return { success: false, error: error instanceof Error ? error.message : "Failed to purchase label" }
	}
}
