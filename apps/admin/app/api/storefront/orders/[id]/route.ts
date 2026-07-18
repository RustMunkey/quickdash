import type { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { orders, orderItems, addresses, payments } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { extractBearerToken, verifyCustomerToken } from "@/lib/storefront-jwt"

async function handleGet(
	request: NextRequest,
	storefront: StorefrontContext,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params
	const token = extractBearerToken(request.headers.get("Authorization"))
	const payload = token ? await verifyCustomerToken(token) : null
	if (!payload || payload.storefrontId !== storefront.id) {
		return storefrontError("Customer authentication is required", 401)
	}
	const customerId = payload.sub

	// Get order
	const [order] = await db
		.select({
			id: orders.id,
			orderNumber: orders.orderNumber,
			status: orders.status,
			subtotal: orders.subtotal,
			discountAmount: orders.discountAmount,
			taxAmount: orders.taxAmount,
			shippingAmount: orders.shippingAmount,
			total: orders.total,
			trackingNumber: orders.trackingNumber,
			trackingUrl: orders.trackingUrl,
			customerNotes: orders.customerNotes,
			shippingAddressId: orders.shippingAddressId,
			billingAddressId: orders.billingAddressId,
			metadata: orders.metadata,
			createdAt: orders.createdAt,
			shippedAt: orders.shippedAt,
			deliveredAt: orders.deliveredAt,
		})
		.from(orders)
		.where(
			and(
				eq(orders.id, id),
				eq(orders.workspaceId, storefront.workspaceId),
				eq(orders.userId, customerId)
			)
		)
		.limit(1)

	if (!order) {
		return storefrontError("Order not found", 404)
	}

	// Get order items
	const items = await db
		.select({
			id: orderItems.id,
			productName: orderItems.productName,
			variantName: orderItems.variantName,
			sku: orderItems.sku,
			unitPrice: orderItems.unitPrice,
			quantity: orderItems.quantity,
			totalPrice: orderItems.totalPrice,
		})
		.from(orderItems)
		.where(eq(orderItems.orderId, order.id))

	const [payment] = await db
		.select({
			status: payments.status,
			method: payments.method,
			provider: payments.provider,
			currency: payments.currency,
		})
		.from(payments)
		.where(eq(payments.orderId, order.id))
		.limit(1)

	// Get addresses
	let shippingAddress = null
	let billingAddress = null

	if (order.shippingAddressId) {
		const [addr] = await db
			.select({
				firstName: addresses.firstName,
				lastName: addresses.lastName,
				company: addresses.company,
				addressLine1: addresses.addressLine1,
				addressLine2: addresses.addressLine2,
				city: addresses.city,
				state: addresses.state,
				postalCode: addresses.postalCode,
				country: addresses.country,
				phone: addresses.phone,
			})
			.from(addresses)
			.where(eq(addresses.id, order.shippingAddressId))
			.limit(1)
		shippingAddress = addr ?? null
	}

	if (order.billingAddressId && order.billingAddressId !== order.shippingAddressId) {
		const [addr] = await db
			.select({
				firstName: addresses.firstName,
				lastName: addresses.lastName,
				company: addresses.company,
				addressLine1: addresses.addressLine1,
				addressLine2: addresses.addressLine2,
				city: addresses.city,
				state: addresses.state,
				postalCode: addresses.postalCode,
				country: addresses.country,
				phone: addresses.phone,
			})
			.from(addresses)
			.where(eq(addresses.id, order.billingAddressId))
			.limit(1)
		billingAddress = addr ?? null
	} else {
		billingAddress = shippingAddress
	}

	if (!shippingAddress) {
		shippingAddress = (order.metadata?.shippingAddress as typeof shippingAddress) ?? null
		billingAddress = billingAddress ?? shippingAddress
	}

	return Response.json({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
			subtotal: order.subtotal,
			discountAmount: order.discountAmount,
			taxAmount: order.taxAmount,
			shippingAmount: order.shippingAmount,
			total: order.total,
			tracking: order.trackingNumber
				? {
						number: order.trackingNumber,
						url: order.trackingUrl,
				  }
				: null,
			trackingNumber: order.trackingNumber,
			trackingUrl: order.trackingUrl,
			payment: payment ?? null,
			customerNotes: order.customerNotes,
			items,
			shippingAddress,
			billingAddress,
			createdAt: order.createdAt,
			shippedAt: order.shippedAt,
			deliveredAt: order.deliveredAt,
		},
	})
}

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
	withStorefrontAuth(
		(req, storefront) => handleGet(req, storefront, context),
		{ requiredPermission: "orders" }
	)(request)
export const OPTIONS = handleCorsOptions
