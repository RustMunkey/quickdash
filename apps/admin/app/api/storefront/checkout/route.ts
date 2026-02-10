import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, inArray } from "@quickdash/db/drizzle"
import { orders, orderItems, products, productVariants, addresses, users } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { generateOrderNumber } from "@/lib/order-utils"

type CartItem = {
	variantId: string
	quantity: number
}

type AddressInput = {
	firstName: string
	lastName: string
	company?: string
	addressLine1: string
	addressLine2?: string
	city: string
	state: string
	postalCode: string
	country: string
	phone?: string
}

type CheckoutInput = {
	customerId: string // User ID from the storefront's auth system
	items: CartItem[]
	shippingAddress: AddressInput
	billingAddress?: AddressInput
	customerNotes?: string
	metadata?: Record<string, unknown>
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: CheckoutInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { customerId, items, shippingAddress, billingAddress, customerNotes, metadata } = body

	// Validate required fields
	if (!customerId || !items?.length || !shippingAddress) {
		return storefrontError("Missing required fields: customerId, items, shippingAddress", 400)
	}

	// Validate customer exists
	const [customer] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, customerId))
		.limit(1)

	if (!customer) {
		return storefrontError("Customer not found", 404)
	}

	// Get variant IDs
	const variantIds = items.map((i) => i.variantId)

	// Fetch variants with product info
	const variants = await db
		.select({
			variantId: productVariants.id,
			variantName: productVariants.name,
			variantSku: productVariants.sku,
			variantPrice: productVariants.price,
			productId: products.id,
			productName: products.name,
			productPrice: products.price,
			workspaceId: products.workspaceId,
			isActive: products.isActive,
		})
		.from(productVariants)
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(
			and(
				inArray(productVariants.id, variantIds),
				eq(productVariants.isActive, true)
			)
		)

	// Validate all variants exist and belong to this workspace
	const variantMap = new Map(variants.map((v) => [v.variantId, v]))
	for (const item of items) {
		const variant = variantMap.get(item.variantId)
		if (!variant) {
			return storefrontError(`Variant ${item.variantId} not found`, 400)
		}
		if (variant.workspaceId !== storefront.workspaceId) {
			return storefrontError(`Variant ${item.variantId} not available`, 400)
		}
		if (!variant.isActive) {
			return storefrontError(`Product for variant ${item.variantId} is not active`, 400)
		}
		if (item.quantity < 1) {
			return storefrontError(`Invalid quantity for variant ${item.variantId}`, 400)
		}
	}

	// Calculate totals
	let subtotal = 0
	const orderItemsData: {
		variantId: string
		productName: string
		variantName: string
		sku: string
		unitPrice: string
		quantity: number
		totalPrice: string
	}[] = []

	for (const item of items) {
		const variant = variantMap.get(item.variantId)!
		const unitPrice = parseFloat(variant.variantPrice || variant.productPrice)
		const totalPrice = unitPrice * item.quantity
		subtotal += totalPrice

		orderItemsData.push({
			variantId: item.variantId,
			productName: variant.productName,
			variantName: variant.variantName,
			sku: variant.variantSku,
			unitPrice: unitPrice.toFixed(2),
			quantity: item.quantity,
			totalPrice: totalPrice.toFixed(2),
		})
	}

	// TODO: Calculate tax based on shipping address
	const taxAmount = 0 // Placeholder - integrate tax calculation later

	// TODO: Calculate shipping based on items and address
	const shippingAmount = 0 // Placeholder - integrate shipping rates later

	const total = subtotal + taxAmount + shippingAmount

	// Create addresses
	const [shippingAddr] = await db
		.insert(addresses)
		.values({
			userId: customerId,
			...shippingAddress,
		})
		.returning()

	let billingAddr = shippingAddr
	if (billingAddress) {
		const [addr] = await db
			.insert(addresses)
			.values({
				userId: customerId,
				...billingAddress,
			})
			.returning()
		billingAddr = addr
	}

	// Create order
	const [order] = await db
		.insert(orders)
		.values({
			workspaceId: storefront.workspaceId,
			orderNumber: generateOrderNumber(),
			userId: customerId,
			status: "pending",
			subtotal: subtotal.toFixed(2),
			taxAmount: taxAmount.toFixed(2),
			shippingAmount: shippingAmount.toFixed(2),
			total: total.toFixed(2),
			shippingAddressId: shippingAddr.id,
			billingAddressId: billingAddr.id,
			customerNotes,
			metadata: {
				...metadata,
				storefrontId: storefront.id,
				storefrontName: storefront.name,
			},
		})
		.returning()

	// Create order items
	await db.insert(orderItems).values(
		orderItemsData.map((item) => ({
			orderId: order.id,
			...item,
		}))
	)

	return Response.json({
		order: {
			id: order.id,
			orderNumber: order.orderNumber,
			status: order.status,
			subtotal: order.subtotal,
			taxAmount: order.taxAmount,
			shippingAmount: order.shippingAmount,
			total: order.total,
			items: orderItemsData,
			createdAt: order.createdAt,
		},
	})
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
