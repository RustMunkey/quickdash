import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { orders, orderItems, addresses } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handleGet(
	request: NextRequest,
	storefront: StorefrontContext,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params
	const { searchParams } = new URL(request.url)

	// Customer ID is required for security - can only view own orders
	const customerId = searchParams.get("customer_id")
	if (!customerId) {
		return storefrontError("customer_id query parameter is required", 400)
	}

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
