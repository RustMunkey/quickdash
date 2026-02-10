import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, sql } from "@quickdash/db/drizzle"
import { orders, orderItems, payments } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, storefrontJson, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { generateOrderNumber, buildOrderConfirmationEmail } from "@/lib/order-utils"
import { sendEmail } from "@/lib/send-email"

// ─── GET: List orders for a customer ───

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)

	const customerId = searchParams.get("customer_id")
	if (!customerId) {
		return storefrontError("customer_id query parameter is required", 400)
	}

	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")))
	const offset = (page - 1) * limit
	const status = searchParams.get("status")

	const conditions = [
		eq(orders.workspaceId, storefront.workspaceId),
		eq(orders.userId, customerId),
	]
	if (status) {
		conditions.push(eq(orders.status, status))
	}

	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
				subtotal: orders.subtotal,
				taxAmount: orders.taxAmount,
				shippingAmount: orders.shippingAmount,
				total: orders.total,
				trackingNumber: orders.trackingNumber,
				trackingUrl: orders.trackingUrl,
				createdAt: orders.createdAt,
				shippedAt: orders.shippedAt,
				deliveredAt: orders.deliveredAt,
			})
			.from(orders)
			.where(and(...conditions))
			.orderBy(desc(orders.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(orders)
			.where(and(...conditions)),
	])

	const totalCount = Number(countResult.count)
	const totalPages = Math.ceil(totalCount / limit)

	return Response.json({
		orders: items,
		pagination: { page, limit, totalCount, totalPages, hasMore: page < totalPages },
	})
}

// ─── POST: Create order (guest or authenticated) ───

type CustomerInput = {
	email: string
	firstName: string
	lastName: string
	phone?: string
}

type AddressInput = {
	firstName?: string
	lastName?: string
	addressLine1: string
	addressLine2?: string
	city: string
	state: string
	postalCode: string
	country: string
	phone?: string
}

type ItemInput = {
	name: string
	price: number
	quantity: number
	productId?: string
	variantId?: string
	sku?: string
	image?: string
}

type PaymentInput = {
	provider: string
	method: string
	externalId?: string
	amount: string | number
	currency: string
	status?: string
	session_id?: string
	captureID?: string
	checkoutId?: string
	orderId?: string
	paymentLinkId?: string
	txHash?: string
	walletAddress?: string
	chain?: string
}

type TotalsInput = {
	subtotal: number
	discount: number
	tax: number
	shipping: number
	total: number
}

type OrderCreateInput = {
	customer: CustomerInput
	shippingAddress: AddressInput
	items: ItemInput[]
	payment: PaymentInput
	totals: TotalsInput
	discountCode?: unknown
	metadata?: Record<string, unknown>
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: OrderCreateInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { customer, shippingAddress, items, payment, totals, discountCode, metadata } = body

	// Validate required fields
	if (!customer?.email) return storefrontError("customer.email is required", 400)
	if (!items?.length) return storefrontError("items array is required", 400)
	if (!payment?.provider) return storefrontError("payment.provider is required", 400)
	if (!totals) return storefrontError("totals is required", 400)

	const orderNumber = generateOrderNumber()

	// Guest orders: store shipping address in metadata (addresses table requires userId FK)
	// Create order
	const [order] = await db
		.insert(orders)
		.values({
			workspaceId: storefront.workspaceId,
			orderNumber,
			userId: null, // Guest order — customer info in metadata
			status: "confirmed",
			subtotal: totals.subtotal.toFixed(2),
			discountAmount: (totals.discount || 0).toFixed(2),
			taxAmount: (totals.tax || 0).toFixed(2),
			shippingAmount: (totals.shipping || 0).toFixed(2),
			total: totals.total.toFixed(2),
			shippingAddressId: null,
			metadata: {
				...metadata,
				storefrontId: storefront.id,
				storefrontName: storefront.name,
				customer: {
					email: customer.email,
					firstName: customer.firstName,
					lastName: customer.lastName,
					phone: customer.phone,
				},
				shippingAddress: shippingAddress || null,
				discountCode: discountCode || null,
			},
		})
		.returning()

	// Create order items
	if (items.length > 0) {
		await db.insert(orderItems).values(
			items.map((item) => ({
				orderId: order.id,
				variantId: item.variantId || null,
				productName: item.name,
				variantName: null,
				sku: item.sku || null,
				unitPrice: item.price.toFixed(2),
				quantity: item.quantity,
				totalPrice: (item.price * item.quantity).toFixed(2),
			}))
		)
	}

	// Create payment record
	const paymentAmount = typeof payment.amount === "string" ? payment.amount : payment.amount.toFixed(2)
	await db.insert(payments).values({
		workspaceId: storefront.workspaceId,
		orderId: order.id,
		method: payment.method || payment.provider,
		provider: payment.provider,
		status: "completed",
		amount: paymentAmount,
		currency: (payment.currency || "USD").toUpperCase(),
		externalId: payment.externalId || payment.session_id || payment.captureID || payment.checkoutId || payment.txHash || null,
		providerData: {
			session_id: payment.session_id,
			captureId: payment.captureID,
			checkoutId: payment.checkoutId,
			orderId: payment.orderId,
			paymentLinkId: payment.paymentLinkId,
			txHash: payment.txHash,
			walletAddress: payment.walletAddress,
			chain: payment.chain,
		},
		chainId: payment.chain || null,
		walletAddress: payment.walletAddress || null,
		txHash: payment.txHash || null,
		paidAt: new Date(),
	})

	// Send order confirmation email (async, don't block response)
	const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
	const emailData = buildOrderConfirmationEmail({
		orderNumber,
		customerName,
		items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.price })),
		subtotal: totals.subtotal,
		discount: totals.discount || 0,
		tax: totals.tax || 0,
		shipping: totals.shipping || 0,
		total: totals.total,
		currency: (payment.currency || "USD").toUpperCase(),
		shippingAddress: shippingAddress || undefined,
		paymentMethod: payment.provider,
	})

	sendEmail({
		to: customer.email,
		subject: emailData.subject,
		html: emailData.html,
		workspaceId: storefront.workspaceId,
	}).catch((err) => {
		console.error("Failed to send order confirmation email:", err)
	})

	return storefrontJson({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
		},
	})
}

export const GET = withStorefrontAuth(handleGet, { requiredPermission: "orders" })
export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
