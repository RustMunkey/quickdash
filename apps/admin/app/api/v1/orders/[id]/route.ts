/**
 * Admin API - Single Order
 *
 * GET /api/v1/orders/:id - Get order with items
 * PATCH /api/v1/orders/:id - Update order status
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { orders, orderItems, orderNotes, users, addresses, productVariants } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"
import { fireWebhooks } from "@/lib/webhooks/outgoing"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("readOrders")
	if (!auth.success) return auth.response

	try {
		// Get order
		const [order] = await db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				subtotal: orders.subtotal,
				taxAmount: orders.taxAmount,
				shippingAmount: orders.shippingAmount,
				discountAmount: orders.discountAmount,
				total: orders.total,
				userId: orders.userId,
				customerName: users.name,
				customerEmail: users.email,
				customerPhone: users.phone,
				customerNotes: orders.customerNotes,
				internalNotes: orders.internalNotes,
				trackingNumber: orders.trackingNumber,
				trackingUrl: orders.trackingUrl,
				shippedAt: orders.shippedAt,
				deliveredAt: orders.deliveredAt,
				shippingAddressId: orders.shippingAddressId,
				billingAddressId: orders.billingAddressId,
				metadata: orders.metadata,
				createdAt: orders.createdAt,
				updatedAt: orders.updatedAt,
			})
			.from(orders)
			.leftJoin(users, eq(orders.userId, users.id))
			.where(and(eq(orders.id, id), eq(orders.workspaceId, auth.workspace.id)))
			.limit(1)

		if (!order) {
			return apiError("Order not found", "NOT_FOUND", 404)
		}

		// Get order items
		const items = await db
			.select({
				id: orderItems.id,
				variantId: orderItems.variantId,
				productName: orderItems.productName,
				variantName: orderItems.variantName,
				sku: orderItems.sku,
				unitPrice: orderItems.unitPrice,
				quantity: orderItems.quantity,
				totalPrice: orderItems.totalPrice,
			})
			.from(orderItems)
			.where(eq(orderItems.orderId, id))

		// Get addresses
		let shippingAddress = null
		let billingAddress = null

		if (order.shippingAddressId) {
			const [addr] = await db
				.select()
				.from(addresses)
				.where(eq(addresses.id, order.shippingAddressId))
				.limit(1)
			shippingAddress = addr
		}

		if (order.billingAddressId) {
			const [addr] = await db
				.select()
				.from(addresses)
				.where(eq(addresses.id, order.billingAddressId))
				.limit(1)
			billingAddress = addr
		}

		// Get order notes
		const notes = await db
			.select({
				id: orderNotes.id,
				content: orderNotes.content,
				createdBy: orderNotes.createdBy,
				createdAt: orderNotes.createdAt,
			})
			.from(orderNotes)
			.where(eq(orderNotes.orderId, id))

		return apiSuccess({
			data: {
				...order,
				items,
				shippingAddress,
				billingAddress,
				notes,
			},
		})
	} catch (error) {
		console.error("Admin API - Get order error:", error)
		return apiError("Failed to get order", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("writeOrders")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select()
			.from(orders)
			.where(and(eq(orders.id, id), eq(orders.workspaceId, auth.workspace.id)))
			.limit(1)

		if (!existing) {
			return apiError("Order not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		const allowedFields = [
			"status", "customerNotes", "internalNotes", "trackingNumber", "trackingUrl"
		]

		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updateData[field] = body[field]
			}
		}

		// Handle status changes with timestamps
		if (body.status === "shipped" && existing.status !== "shipped") {
			updateData.shippedAt = new Date()
		}
		if (body.status === "delivered" && existing.status !== "delivered") {
			updateData.deliveredAt = new Date()
		}

		// Update order
		const [updated] = await db
			.update(orders)
			.set(updateData)
			.where(eq(orders.id, id))
			.returning()

		// Fire appropriate webhook based on status change
		if (body.status && body.status !== existing.status) {
			const eventMap: Record<string, string> = {
				shipped: "order.shipped",
				delivered: "order.delivered",
				canceled: "order.cancelled",
				refunded: "order.refunded",
			}
			const event = eventMap[body.status]
			if (event) {
				fireWebhooks(event as any, { order: updated }, auth.workspace.id)
			} else {
				fireWebhooks("order.updated", { order: updated }, auth.workspace.id)
			}
		} else {
			fireWebhooks("order.updated", { order: updated }, auth.workspace.id)
		}

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update order error:", error)
		return apiError("Failed to update order", "INTERNAL_ERROR", 500)
	}
}
