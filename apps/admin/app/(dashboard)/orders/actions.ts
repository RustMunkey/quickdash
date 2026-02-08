"use server"

import { eq, and, desc, count, inArray, sql } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { orders, orderItems, orderNotes, users, payments, addresses, inventory, auditLog } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { fireWebhooks } from "@/lib/webhooks/outgoing"
import { registerTracking, isTracktryConfigured } from "@/lib/tracking/service"
import { detectCarrier } from "@/lib/tracking/carrier-detector"
import { sendShippingNotification } from "@/lib/email/shipping-notifications"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { emitOrderEvent, emitOrderFulfilled, emitOrderCancelled } from "@/lib/workflows"

async function requireOrdersPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageOrders")
	if (!canManage) {
		throw new Error("You don't have permission to manage orders")
	}
	return workspace
}

const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded", "partially_refunded", "returned"] as const

interface GetOrdersParams {
	page?: number
	pageSize?: number
	status?: string
	search?: string
}

export async function getOrders(params: GetOrdersParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status, search } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace
	const conditions = [eq(orders.workspaceId, workspace.id)]
	if (status && status !== "all") {
		conditions.push(eq(orders.status, status))
	}
	if (search) {
		conditions.push(sql`(${orders.orderNumber} ILIKE ${`%${search}%`} OR ${users.name} ILIKE ${`%${search}%`})`)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				total: orders.total,
				customerName: users.name,
				customerEmail: users.email,
				createdAt: orders.createdAt,
			})
			.from(orders)
			.leftJoin(users, eq(orders.userId, users.id))
			.where(where)
			.orderBy(desc(orders.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(orders).leftJoin(users, eq(orders.userId, users.id)).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

interface GetOrdersByStatusParams {
	statuses: string[]
	page?: number
	pageSize?: number
}

export async function getOrdersByStatus(params: GetOrdersByStatusParams) {
	const workspace = await requireWorkspace()
	const { statuses, page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = and(eq(orders.workspaceId, workspace.id), inArray(orders.status, statuses))

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				total: orders.total,
				customerName: users.name,
				trackingNumber: orders.trackingNumber,
				createdAt: orders.createdAt,
			})
			.from(orders)
			.leftJoin(users, eq(orders.userId, users.id))
			.where(where)
			.orderBy(desc(orders.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(orders).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function getOrder(id: string) {
	const workspace = await requireWorkspace()

	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) throw new Error("Order not found")

	const [customer] = await db
		.select({ name: users.name, email: users.email, phone: users.phone })
		.from(users)
		.where(eq(users.id, order.userId))
		.limit(1)

	const items = await db
		.select()
		.from(orderItems)
		.where(eq(orderItems.orderId, id))

	const payment = await db
		.select()
		.from(payments)
		.where(eq(payments.orderId, id))
		.limit(1)
		.then((r) => r[0] ?? null)

	const shippingAddress = order.shippingAddressId
		? await db.select().from(addresses).where(eq(addresses.id, order.shippingAddressId)).limit(1).then((r) => r[0] ?? null)
		: null

	return { ...order, customer, items, payment, shippingAddress }
}

export async function updateOrderStatus(id: string, status: string) {
	const workspace = await requireOrdersPermission()

	if (!ORDER_STATUSES.includes(status as any)) {
		throw new Error("Invalid status")
	}

	const updates: Record<string, unknown> = { status, updatedAt: new Date() }
	if (status === "shipped") updates.shippedAt = new Date()
	if (status === "delivered") updates.deliveredAt = new Date()

	const [order] = await db
		.update(orders)
		.set(updates)
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "order.updated",
		targetType: "order",
		targetId: id,
		targetLabel: order.orderNumber,
		metadata: { newStatus: status },
	})

	// Broadcast real-time order update
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "orders"), "order:updated", {
			orderId: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
			previousStatus: status,
		})
	}

	// Fire outgoing webhooks based on status
	const webhookData = {
		orderId: order.id,
		orderNumber: order.orderNumber,
		status: order.status,
		total: order.total,
		updatedAt: order.updatedAt?.toISOString(),
	}

	await fireWebhooks("order.updated", webhookData, workspace.id)

	if (status === "shipped") {
		await fireWebhooks("order.shipped", {
			...webhookData,
			shippedAt: order.shippedAt?.toISOString(),
			trackingNumber: order.trackingNumber,
		}, workspace.id)
	} else if (status === "delivered") {
		await fireWebhooks("order.delivered", {
			...webhookData,
			deliveredAt: order.deliveredAt?.toISOString(),
		}, workspace.id)
	}

	// Emit workflow event for fulfilled orders
	if (status === "delivered") {
		await emitOrderFulfilled({
			workspaceId: workspace.id,
			orderId: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
			userId: order.userId,
			total: order.total,
			subtotal: order.subtotal,
		})
	}

	return order
}

export async function addTracking(id: string, trackingNumber: string, trackingUrl?: string) {
	const workspace = await requireOrdersPermission()

	// Auto-detect carrier from tracking number
	const detectedCarrier = detectCarrier(trackingNumber)

	// Generate tracking URL if not provided and carrier detected
	const finalTrackingUrl = trackingUrl || detectedCarrier?.trackingUrl || null

	const [order] = await db
		.update(orders)
		.set({
			trackingNumber,
			trackingUrl: finalTrackingUrl,
			updatedAt: new Date(),
		})
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "order.updated",
		targetType: "order",
		targetId: id,
		targetLabel: order.orderNumber,
		metadata: {
			action: "tracking_added",
			trackingNumber,
			carrier: detectedCarrier?.name,
		},
	})

	// Register with Tracktry for live updates (if configured)
	if (isTracktryConfigured() && detectedCarrier) {
		const result = await registerTracking(
			trackingNumber,
			detectedCarrier.code,
			order.id
		)
		if (result.success) {
			console.log(`[Tracking] Registered ${trackingNumber} with Tracktry`)
		} else {
			console.warn(`[Tracking] Failed to register with Tracktry: ${result.error}`)
		}
	}

	// Fire webhook for order update
	await fireWebhooks("order.updated", {
		orderId: order.id,
		orderNumber: order.orderNumber,
		status: order.status,
		trackingNumber: order.trackingNumber,
		trackingUrl: order.trackingUrl,
		carrier: detectedCarrier?.name,
		updatedAt: order.updatedAt?.toISOString(),
	}, workspace.id)

	// Send "shipped" notification to customer (non-blocking)
	sendShippingNotification({
		orderId: order.id,
		trackingNumber,
		trackingUrl: finalTrackingUrl || undefined,
		carrierName: detectedCarrier?.name,
		status: "shipped",
	}).catch((err) => {
		console.error("[Order] Failed to send shipped notification:", err)
	})

	return order
}

export async function removeTracking(id: string) {
	const workspace = await requireOrdersPermission()

	const [order] = await db
		.update(orders)
		.set({
			trackingNumber: null,
			trackingUrl: null,
			updatedAt: new Date(),
		})
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "order.updated",
		targetType: "order",
		targetId: id,
		targetLabel: order.orderNumber,
		metadata: { action: "tracking_removed" },
	})

	// Fire webhook for order update
	await fireWebhooks("order.updated", {
		orderId: order.id,
		orderNumber: order.orderNumber,
		status: order.status,
		trackingNumber: null,
		trackingUrl: null,
		updatedAt: order.updatedAt?.toISOString(),
	}, workspace.id)

	return order
}


export async function processRefund(id: string, amount: string, reason: string) {
	const workspace = await requireOrdersPermission()

	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) throw new Error("Order not found")

	const refundAmount = parseFloat(amount)
	const orderTotal = parseFloat(order.total)
	const isFullRefund = refundAmount >= orderTotal

	await db
		.update(orders)
		.set({
			status: isFullRefund ? "refunded" : "partially_refunded",
			updatedAt: new Date(),
		})
		.where(eq(orders.id, id))

	// Update payment if exists
	await db
		.update(payments)
		.set({ status: "refunded", refundedAt: new Date() })
		.where(eq(payments.orderId, id))

	await logAudit({
		action: "order.refunded",
		targetType: "order",
		targetId: id,
		targetLabel: order.orderNumber,
		metadata: { amount: refundAmount, reason, isFullRefund },
	})

	// Fire webhook for refund
	await fireWebhooks("order.refunded", {
		orderId: order.id,
		orderNumber: order.orderNumber,
		refundAmount,
		isFullRefund,
		reason,
		status: isFullRefund ? "refunded" : "partially_refunded",
	}, workspace.id)
}

export async function cancelOrder(id: string) {
	const workspace = await requireOrdersPermission()

	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) throw new Error("Order not found")

	await db
		.update(orders)
		.set({ status: "cancelled", updatedAt: new Date() })
		.where(and(eq(orders.id, id), eq(orders.workspaceId, workspace.id)))

	// Restore inventory for order items
	const items = await db
		.select()
		.from(orderItems)
		.where(eq(orderItems.orderId, id))

	for (const item of items) {
		await db
			.update(inventory)
			.set({
				quantity: sql`${inventory.quantity} + ${item.quantity}`,
				updatedAt: new Date(),
			})
			.where(eq(inventory.variantId, item.variantId))
	}

	await logAudit({
		action: "order.updated",
		targetType: "order",
		targetId: id,
		targetLabel: order.orderNumber,
		metadata: { action: "cancelled" },
	})

	// Fire webhook for cancellation
	await fireWebhooks("order.cancelled", {
		orderId: order.id,
		orderNumber: order.orderNumber,
		total: order.total,
		itemsRestored: items.length,
	}, workspace.id)

	// Emit workflow event for cancelled orders
	await emitOrderCancelled({
		workspaceId: workspace.id,
		orderId: order.id,
		orderNumber: order.orderNumber,
		status: "cancelled",
		userId: order.userId,
		total: order.total,
		subtotal: order.subtotal,
	})
}

// --- Order Notes CRUD ---

async function verifyOrderAccess(orderId: string, workspaceId: string) {
	const [order] = await db
		.select({ id: orders.id })
		.from(orders)
		.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspaceId)))
		.limit(1)
	if (!order) throw new Error("Order not found")
	return order
}

export async function getOrderNotes(orderId: string) {
	const workspace = await requireWorkspace()
	await verifyOrderAccess(orderId, workspace.id)

	return db
		.select({
			id: orderNotes.id,
			content: orderNotes.content,
			createdAt: orderNotes.createdAt,
			updatedAt: orderNotes.updatedAt,
			authorName: users.name,
			authorEmail: users.email,
		})
		.from(orderNotes)
		.leftJoin(users, eq(orderNotes.createdBy, users.id))
		.where(eq(orderNotes.orderId, orderId))
		.orderBy(desc(orderNotes.createdAt))
}

export async function addOrderNote(orderId: string, content: string) {
	const workspace = await requireOrdersPermission()
	await verifyOrderAccess(orderId, workspace.id)

	const [note] = await db
		.insert(orderNotes)
		.values({
			orderId,
			content,
			createdBy: workspace.ownerId, // TODO: Get actual user ID from session
		})
		.returning()

	return note
}

export async function updateOrderNote(noteId: string, content: string) {
	const workspace = await requireOrdersPermission()

	// Verify note belongs to an order in this workspace
	const [note] = await db
		.select({ id: orderNotes.id })
		.from(orderNotes)
		.innerJoin(orders, eq(orders.id, orderNotes.orderId))
		.where(and(eq(orderNotes.id, noteId), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!note) throw new Error("Note not found")

	const [updated] = await db
		.update(orderNotes)
		.set({ content, updatedAt: new Date() })
		.where(eq(orderNotes.id, noteId))
		.returning()

	return updated
}

export async function deleteOrderNote(noteId: string) {
	const workspace = await requireOrdersPermission()

	// Verify note belongs to an order in this workspace
	const [note] = await db
		.select({ id: orderNotes.id })
		.from(orderNotes)
		.innerJoin(orders, eq(orders.id, orderNotes.orderId))
		.where(and(eq(orderNotes.id, noteId), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!note) throw new Error("Note not found")

	await db.delete(orderNotes).where(eq(orderNotes.id, noteId))
}

export async function getOrderActivity(orderId: string) {
	const workspace = await requireWorkspace()
	await verifyOrderAccess(orderId, workspace.id)

	return db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			userName: auditLog.userName,
			metadata: auditLog.metadata,
			createdAt: auditLog.createdAt,
		})
		.from(auditLog)
		.where(and(eq(auditLog.targetType, "order"), eq(auditLog.targetId, orderId)))
		.orderBy(desc(auditLog.createdAt))
		.limit(20)
}

export async function clearOrderActivity(orderId: string) {
	const workspace = await requireOrdersPermission()
	await verifyOrderAccess(orderId, workspace.id)

	await db
		.delete(auditLog)
		.where(and(eq(auditLog.targetType, "order"), eq(auditLog.targetId, orderId)))
}

export async function bulkDeleteReturns(ids: string[]) {
	const workspace = await requireOrdersPermission()
	await db.delete(orders).where(and(inArray(orders.id, ids), eq(orders.workspaceId, workspace.id)))
}

export async function bulkDeleteOrders(ids: string[]) {
	const workspace = await requireOrdersPermission()
	await db.delete(orders).where(and(inArray(orders.id, ids), eq(orders.workspaceId, workspace.id)))
}

export async function bulkUpdateOrderStatus(ids: string[], status: string) {
	const workspace = await requireOrdersPermission()

	const updates: Record<string, unknown> = { status, updatedAt: new Date() }
	if (status === "shipped") updates.shippedAt = new Date()

	// Only update orders in this workspace
	await db
		.update(orders)
		.set(updates)
		.where(and(inArray(orders.id, ids), eq(orders.workspaceId, workspace.id)))

	await logAudit({
		action: "order.updated",
		targetType: "order",
		metadata: { count: ids.length, newStatus: status, bulk: true },
	})

	// Fire webhooks for each order in bulk update
	for (const orderId of ids) {
		await fireWebhooks("order.updated", {
			orderId,
			status,
			bulk: true,
		}, workspace.id)

		if (status === "shipped") {
			await fireWebhooks("order.shipped", {
				orderId,
				status,
				shippedAt: new Date().toISOString(),
			}, workspace.id)
		} else if (status === "delivered") {
			await fireWebhooks("order.delivered", {
				orderId,
				status,
				deliveredAt: new Date().toISOString(),
			}, workspace.id)
		}
	}
}

// ============================================
// Shipping Label Generation (Platform Shippo)
// ============================================

import {
	getShippingRates as shippoGetRates,
	createLabelForOrder,
	type ShippoAddress,
	type ShippoParcel,
	type ShippoRate,
} from "@/lib/shippo"
import { storeSettings } from "@quickdash/db/schema"

interface ShipFromAddress {
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

async function getWorkspaceShipFromAddress(workspaceId: string): Promise<ShipFromAddress | null> {
	// Get ship-from address from workspace settings
	const settings = await db
		.select()
		.from(storeSettings)
		.where(and(
			eq(storeSettings.workspaceId, workspaceId),
			eq(storeSettings.group, "shipping")
		))

	const getValue = (key: string) => settings.find(s => s.key === key)?.value || ""

	const name = getValue("ship_from_name")
	const street1 = getValue("ship_from_street1")
	const city = getValue("ship_from_city")
	const state = getValue("ship_from_state")
	const zip = getValue("ship_from_zip")
	const country = getValue("ship_from_country")

	// Return null if essential fields are missing
	if (!name || !street1 || !city || !state || !zip || !country) {
		return null
	}

	return {
		name,
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

export interface ParcelDimensions {
	length: number
	width: number
	height: number
	weight: number
	distanceUnit: "in" | "cm"
	massUnit: "lb" | "kg" | "oz" | "g"
}

export async function getShippingRatesForOrder(
	orderId: string,
	parcel: ParcelDimensions
): Promise<{ rates: ShippoRate[]; shipmentId: string }> {
	const workspace = await requireOrdersPermission()

	// Get order with shipping address
	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) throw new Error("Order not found")
	if (!order.shippingAddressId) throw new Error("Order has no shipping address")

	// Get shipping address
	const [shippingAddress] = await db
		.select()
		.from(addresses)
		.where(eq(addresses.id, order.shippingAddressId))
		.limit(1)

	if (!shippingAddress) throw new Error("Shipping address not found")

	// Get ship-from address from workspace settings
	const shipFrom = await getWorkspaceShipFromAddress(workspace.id)
	if (!shipFrom) {
		throw new Error("Ship-from address not configured. Go to Settings → Shipping to set up your return address.")
	}

	// Convert to Shippo format
	const addressFrom: ShippoAddress = {
		name: shipFrom.name,
		company: shipFrom.company,
		street1: shipFrom.street1,
		street2: shipFrom.street2,
		city: shipFrom.city,
		state: shipFrom.state,
		zip: shipFrom.zip,
		country: shipFrom.country,
		phone: shipFrom.phone,
		email: shipFrom.email,
	}

	const addressTo: ShippoAddress = {
		name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
		street1: shippingAddress.addressLine1,
		street2: shippingAddress.addressLine2 || undefined,
		city: shippingAddress.city,
		state: shippingAddress.state,
		zip: shippingAddress.postalCode,
		country: shippingAddress.country,
		phone: shippingAddress.phone || undefined,
	}

	const shippoParcel: ShippoParcel = {
		length: parcel.length,
		width: parcel.width,
		height: parcel.height,
		distance_unit: parcel.distanceUnit,
		weight: parcel.weight,
		mass_unit: parcel.massUnit,
	}

	const result = await shippoGetRates(addressFrom, addressTo, shippoParcel)

	return {
		rates: result.rates,
		shipmentId: result.shipmentId,
	}
}

export async function generateShippingLabel(
	orderId: string,
	parcel: ParcelDimensions,
	serviceLevel?: string
): Promise<{
	trackingNumber: string
	trackingUrl: string
	labelUrl: string
	carrier: string
	service: string
	cost: string
}> {
	const workspace = await requireOrdersPermission()

	// Get order with shipping address
	const [order] = await db
		.select()
		.from(orders)
		.where(and(eq(orders.id, orderId), eq(orders.workspaceId, workspace.id)))
		.limit(1)

	if (!order) throw new Error("Order not found")
	if (!order.shippingAddressId) throw new Error("Order has no shipping address")
	if (order.trackingNumber) throw new Error("Order already has a tracking number")

	// Get shipping address
	const [shippingAddress] = await db
		.select()
		.from(addresses)
		.where(eq(addresses.id, order.shippingAddressId))
		.limit(1)

	if (!shippingAddress) throw new Error("Shipping address not found")

	// Get ship-from address
	const shipFrom = await getWorkspaceShipFromAddress(workspace.id)
	if (!shipFrom) {
		throw new Error("Ship-from address not configured. Go to Settings → Shipping to set up your return address.")
	}

	// Convert to Shippo format
	const addressFrom: ShippoAddress = {
		name: shipFrom.name,
		company: shipFrom.company,
		street1: shipFrom.street1,
		street2: shipFrom.street2,
		city: shipFrom.city,
		state: shipFrom.state,
		zip: shipFrom.zip,
		country: shipFrom.country,
		phone: shipFrom.phone,
		email: shipFrom.email,
	}

	const addressTo: ShippoAddress = {
		name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
		street1: shippingAddress.addressLine1,
		street2: shippingAddress.addressLine2 || undefined,
		city: shippingAddress.city,
		state: shippingAddress.state,
		zip: shippingAddress.postalCode,
		country: shippingAddress.country,
		phone: shippingAddress.phone || undefined,
	}

	const shippoParcel: ShippoParcel = {
		length: parcel.length,
		width: parcel.width,
		height: parcel.height,
		distance_unit: parcel.distanceUnit,
		weight: parcel.weight,
		mass_unit: parcel.massUnit,
	}

	// Generate label via Shippo
	const label = await createLabelForOrder(addressFrom, addressTo, shippoParcel, serviceLevel)

	// Update order with tracking info
	await db
		.update(orders)
		.set({
			trackingNumber: label.trackingNumber,
			trackingUrl: label.trackingUrl,
			status: "shipped",
			shippedAt: new Date(),
			updatedAt: new Date(),
			metadata: {
				...((order.metadata as Record<string, unknown>) || {}),
				shippingLabel: {
					labelUrl: label.labelUrl,
					carrier: label.carrier,
					service: label.service,
					cost: label.cost,
					currency: label.currency,
					generatedAt: new Date().toISOString(),
				},
			},
		})
		.where(eq(orders.id, orderId))

	// Log audit
	await logAudit({
		action: "order.updated",
		targetType: "order",
		targetId: orderId,
		targetLabel: order.orderNumber,
		metadata: {
			action: "label_generated",
			carrier: label.carrier,
			service: label.service,
			trackingNumber: label.trackingNumber,
			cost: label.cost,
		},
	})

	// Register with 17track for live updates
	const detectedCarrier = detectCarrier(label.trackingNumber)
	if (isTracktryConfigured() && detectedCarrier) {
		const result = await registerTracking(
			label.trackingNumber,
			detectedCarrier.code,
			order.id
		)
		if (result.success) {
			console.log(`[Tracking] Registered ${label.trackingNumber} with 17track`)
		}
	}

	// Fire webhooks
	await fireWebhooks("order.shipped", {
		orderId: order.id,
		orderNumber: order.orderNumber,
		status: "shipped",
		trackingNumber: label.trackingNumber,
		trackingUrl: label.trackingUrl,
		carrier: label.carrier,
		service: label.service,
		labelUrl: label.labelUrl,
		shippedAt: new Date().toISOString(),
	}, workspace.id)

	// Send shipping notification to customer
	sendShippingNotification({
		orderId: order.id,
		trackingNumber: label.trackingNumber,
		trackingUrl: label.trackingUrl,
		carrierName: label.carrier,
		status: "shipped",
	}).catch((err) => {
		console.error("[Order] Failed to send shipped notification:", err)
	})

	return {
		trackingNumber: label.trackingNumber,
		trackingUrl: label.trackingUrl,
		labelUrl: label.labelUrl,
		carrier: label.carrier,
		service: label.service,
		cost: label.cost,
	}
}
