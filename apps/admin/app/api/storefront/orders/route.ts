import type { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, sql, inArray, gte } from "@quickdash/db/drizzle"
import { orders, orderItems, payments, inventory, inventoryLogs, productVariants, products } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, storefrontJson, handleCorsOptions, getWorkspaceSiteMode, type StorefrontContext } from "@/lib/storefront-auth"
import { generateOrderNumber, buildOrderConfirmationEmail } from "@/lib/order-utils"
import { sendEmail } from "@/lib/send-email"
import { extractBearerToken, verifyCustomerToken } from "@/lib/storefront-jwt"
import { getPayPalCredentials } from "@/lib/workspace-integrations"
import { verifyCompletedPayPalCapture } from "@/lib/paypal"

class InventoryConflictError extends Error {}

function moneyMatches(left: string | number, right: string | number) {
	const leftCents = Math.round(Number(left) * 100)
	const rightCents = Math.round(Number(right) * 100)
	return Number.isFinite(leftCents) && Number.isFinite(rightCents) && leftCents === rightCents
}

async function getAuthenticatedCustomerId(request: NextRequest, storefront: StorefrontContext) {
	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) return null
	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== storefront.id) return null
	return payload.sub
}

// ─── GET: List orders for a customer ───

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)

	const customerId = await getAuthenticatedCustomerId(request, storefront)
	if (!customerId) {
		return storefrontError("Customer authentication is required", 401)
	}

	const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
	const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)))
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
				currency: payments.currency,
				createdAt: orders.createdAt,
				shippedAt: orders.shippedAt,
				deliveredAt: orders.deliveredAt,
			})
			.from(orders)
			.leftJoin(payments, eq(payments.orderId, orders.id))
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
	// Check workspace mode
	const siteMode = await getWorkspaceSiteMode(storefront.workspaceId)
	if (siteMode.maintenance) {
		return storefrontError("Store is currently in maintenance mode", 503)
	}

	let body: OrderCreateInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { customer, shippingAddress, items, payment, totals, discountCode, metadata } = body
	const authenticatedCustomerId = await getAuthenticatedCustomerId(request, storefront)

	// Validate required fields
	if (!customer?.email) return storefrontError("customer.email is required", 400)
	if (!items?.length) return storefrontError("items array is required", 400)
	if (!payment?.provider) return storefrontError("payment.provider is required", 400)
	if (!totals) return storefrontError("totals is required", 400)
	if (payment.provider !== "paypal") return storefrontError("Only PayPal is supported", 400)
	if (!payment.captureID || !payment.orderId) {
		return storefrontError("Verified PayPal order and capture IDs are required", 400)
	}
	if (items.some((item) => !item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
		return storefrontError("Every order item requires a variant and positive whole quantity", 400)
	}

	const existingPayment = await db
		.select({ orderId: payments.orderId })
		.from(payments)
		.where(and(
			eq(payments.workspaceId, storefront.workspaceId),
			eq(payments.externalId, payment.captureID)
		))
		.limit(1)

	if (existingPayment[0]) {
		const [existingOrder] = await db
			.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })
			.from(orders)
			.where(eq(orders.id, existingPayment[0].orderId))
			.limit(1)
		return storefrontJson({ order: existingOrder, idempotent: true })
	}

	const paypalCredentials = await getPayPalCredentials(storefront.workspaceId)
	if (!paypalCredentials) return storefrontError("PayPal is not configured", 503)

	let verifiedCapture: Awaited<ReturnType<typeof verifyCompletedPayPalCapture>>
	try {
		verifiedCapture = await verifyCompletedPayPalCapture(
			paypalCredentials,
			payment.orderId,
			payment.captureID
		)
	} catch (error) {
		console.error("PayPal verification failed:", error)
		return storefrontError("PayPal payment could not be verified", 409)
	}

	if (
		!moneyMatches(verifiedCapture.amount, totals.total)
		|| !moneyMatches(verifiedCapture.amount, payment.amount)
		|| verifiedCapture.currency !== payment.currency.toUpperCase()
	) {
		return storefrontError("PayPal payment amount does not match the order", 409)
	}

	type VerifiedPayPalItem = {
		name: string
		variantId: string
		quantity: number
		unitAmount: number
	}
	const verifiedItems = new Map<string, VerifiedPayPalItem>(
		verifiedCapture.items.map((item: VerifiedPayPalItem) => [item.variantId, item])
	)
	if (
		verifiedCapture.items.length !== items.length
		|| items.some((item) => {
			const verifiedItem = item.variantId ? verifiedItems.get(item.variantId) : null
			return !verifiedItem
				|| verifiedItem.quantity !== item.quantity
				|| !moneyMatches(verifiedItem.unitAmount, item.price)
		})
	) {
		return storefrontError("Order items do not match the verified PayPal purchase", 409)
	}

	const verifiedTotals = {
		subtotal: Number(verifiedCapture.breakdown.subtotal),
		discount: Number(verifiedCapture.breakdown.discount),
		tax: 0,
		shipping: Number(verifiedCapture.breakdown.shipping),
		total: Number(verifiedCapture.amount),
	}
	if (Object.values(verifiedTotals).some((value) => !Number.isFinite(value) || value < 0)) {
		return storefrontError("PayPal returned invalid order totals", 409)
	}

	const variantIds = [...new Set(items.map((item) => item.variantId as string))]
	const validVariants = await db
		.select({ id: productVariants.id })
		.from(productVariants)
		.innerJoin(products, eq(products.id, productVariants.productId))
		.where(and(
			inArray(productVariants.id, variantIds),
			eq(productVariants.isActive, true),
			eq(products.isActive, true),
			eq(products.workspaceId, storefront.workspaceId)
		))

	if (validVariants.length !== variantIds.length) {
		return storefrontError("One or more products are no longer available", 409)
	}

	const orderNumber = generateOrderNumber()

	let order: { id: string; orderNumber: string; status: string }
	try {
		order = await db.transaction(async (tx) => {
			const [createdOrder] = await tx
				.insert(orders)
				.values({
					workspaceId: storefront.workspaceId,
					orderNumber,
					userId: authenticatedCustomerId,
					status: "confirmed",
					subtotal: verifiedTotals.subtotal.toFixed(2),
					discountAmount: verifiedTotals.discount.toFixed(2),
					taxAmount: verifiedTotals.tax.toFixed(2),
					shippingAmount: verifiedTotals.shipping.toFixed(2),
					total: verifiedTotals.total.toFixed(2),
					shippingAddressId: null,
					metadata: {
						...metadata,
						storefrontId: storefront.id,
						storefrontName: storefront.name,
						customer: { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone },
						shippingAddress: shippingAddress || null,
						discountCode: discountCode || null,
						paypalOrderId: verifiedCapture.paypalOrderId,
						paypalCaptureId: verifiedCapture.captureId,
						...(siteMode.sandbox ? { sandbox: true } : {}),
					},
				})
				.returning({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })

			await tx.insert(orderItems).values(items.map((item) => ({
				orderId: createdOrder.id,
				variantId: item.variantId,
				productName: verifiedItems.get(item.variantId as string)?.name || item.name,
				variantName: null,
				sku: null,
				unitPrice: (verifiedItems.get(item.variantId as string)?.unitAmount || 0).toFixed(2),
				quantity: item.quantity,
				totalPrice: ((verifiedItems.get(item.variantId as string)?.unitAmount || 0) * item.quantity).toFixed(2),
			})))

			for (const item of items) {
				const [updatedInventory] = await tx
					.update(inventory)
					.set({
						quantity: sql`${inventory.quantity} - ${item.quantity}`,
						updatedAt: new Date(),
					})
					.where(and(
						eq(inventory.workspaceId, storefront.workspaceId),
						eq(inventory.variantId, item.variantId as string),
						gte(sql`${inventory.quantity} - ${inventory.reservedQuantity}`, item.quantity)
					))
					.returning({ quantity: inventory.quantity })

				if (!updatedInventory) throw new InventoryConflictError(`${item.name} is out of stock`)

				await tx.insert(inventoryLogs).values({
					workspaceId: storefront.workspaceId,
					variantId: item.variantId as string,
					previousQuantity: updatedInventory.quantity + item.quantity,
					newQuantity: updatedInventory.quantity,
					reason: "order_fulfillment",
					orderId: createdOrder.id,
				})
			}

			await tx.insert(payments).values({
				workspaceId: storefront.workspaceId,
				orderId: createdOrder.id,
				method: "paypal",
				provider: "paypal",
				status: "completed",
				amount: verifiedCapture.amount,
				currency: verifiedCapture.currency,
				externalId: verifiedCapture.captureId,
				providerData: { paypalOrderId: verifiedCapture.paypalOrderId, captureId: verifiedCapture.captureId },
				paidAt: new Date(),
			})

			return createdOrder
		})
	} catch (error) {
		if (error instanceof InventoryConflictError) {
			order = await db.transaction(async (tx) => {
				const [reviewOrder] = await tx
					.insert(orders)
					.values({
						workspaceId: storefront.workspaceId,
						orderNumber,
						userId: authenticatedCustomerId,
						status: "inventory_review",
						subtotal: verifiedTotals.subtotal.toFixed(2),
						discountAmount: verifiedTotals.discount.toFixed(2),
						taxAmount: verifiedTotals.tax.toFixed(2),
						shippingAmount: verifiedTotals.shipping.toFixed(2),
						total: verifiedTotals.total.toFixed(2),
						metadata: {
							...metadata,
							storefrontId: storefront.id,
							storefrontName: storefront.name,
							customer: { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone },
							shippingAddress: shippingAddress || null,
							discountCode: discountCode || null,
							paypalOrderId: verifiedCapture.paypalOrderId,
							paypalCaptureId: verifiedCapture.captureId,
							inventoryIssue: error.message,
							requiresManualReview: true,
						},
					})
					.returning({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })

				await tx.insert(orderItems).values(items.map((item) => ({
					orderId: reviewOrder.id,
					variantId: item.variantId,
					productName: verifiedItems.get(item.variantId as string)?.name || item.name,
					variantName: null,
					sku: null,
					unitPrice: (verifiedItems.get(item.variantId as string)?.unitAmount || 0).toFixed(2),
					quantity: item.quantity,
					totalPrice: ((verifiedItems.get(item.variantId as string)?.unitAmount || 0) * item.quantity).toFixed(2),
				})))

				await tx.insert(payments).values({
					workspaceId: storefront.workspaceId,
					orderId: reviewOrder.id,
					method: "paypal",
					provider: "paypal",
					status: "completed",
					amount: verifiedCapture.amount,
					currency: verifiedCapture.currency,
					externalId: verifiedCapture.captureId,
					providerData: { paypalOrderId: verifiedCapture.paypalOrderId, captureId: verifiedCapture.captureId, inventoryReview: true },
					paidAt: new Date(),
				})

				return reviewOrder
			})
		} else if ((error as { code?: string })?.code === "23505") {
			const [duplicate] = await db
				.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })
				.from(payments)
				.innerJoin(orders, eq(orders.id, payments.orderId))
				.where(and(eq(payments.workspaceId, storefront.workspaceId), eq(payments.externalId, payment.captureID)))
				.limit(1)
			if (duplicate) return storefrontJson({ order: duplicate, idempotent: true })
			throw error
		} else {
			throw error
		}
	}

	// Send order confirmation email (async, don't block response)
	const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
	const emailData = buildOrderConfirmationEmail({
		orderNumber,
		customerName,
		items: items.map((item) => ({
			name: verifiedItems.get(item.variantId as string)?.name || item.name,
			quantity: item.quantity,
			unitPrice: verifiedItems.get(item.variantId as string)?.unitAmount || 0,
		})),
		subtotal: verifiedTotals.subtotal,
		discount: verifiedTotals.discount,
		tax: verifiedTotals.tax,
		shipping: verifiedTotals.shipping,
		total: verifiedTotals.total,
		currency: verifiedCapture.currency,
		shippingAddress: shippingAddress || undefined,
		paymentMethod: payment.provider,
	})

	try {
		await sendEmail({
			to: customer.email,
			subject: emailData.subject,
			html: emailData.html,
			workspaceId: storefront.workspaceId,
		})
	} catch (err) {
		console.error("Failed to send order confirmation email:", err)
	}

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
