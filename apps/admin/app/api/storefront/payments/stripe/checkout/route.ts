import { type NextRequest } from "next/server"
import Stripe from "stripe"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getStripeSecretKey } from "@/lib/workspace-integrations"
import { verifyCustomerToken, extractBearerToken } from "@/lib/storefront-jwt"

type CheckoutItem = {
	name: string
	description?: string
	image?: string
	price: number // in dollars
	quantity: number
}

type CheckoutInput = {
	items: CheckoutItem[]
	successUrl: string
	cancelUrl: string
	customerEmail?: string
	metadata?: Record<string, string>
	shippingAmount?: number
	discountAmount?: number
	discountCode?: string
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	// Get workspace's Stripe key
	const stripeSecretKey = await getStripeSecretKey(storefront.workspaceId)
	if (!stripeSecretKey) {
		return storefrontError(
			"Payment not configured. Please contact the store owner.",
			503
		)
	}

	let body: CheckoutInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { items, successUrl, cancelUrl, customerEmail, metadata, shippingAmount, discountAmount, discountCode } = body

	// Validate required fields
	if (!items?.length || !successUrl || !cancelUrl) {
		return storefrontError("Missing required fields: items, successUrl, cancelUrl", 400)
	}

	// Try to get customer email from token if not provided
	let email = customerEmail
	if (!email) {
		const token = extractBearerToken(request.headers.get("Authorization"))
		if (token) {
			const payload = await verifyCustomerToken(token)
			if (payload) {
				email = payload.email
			}
		}
	}

	try {
		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2026-01-28.clover",
		})

		// Build line items
		const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
			(item) => ({
				price_data: {
					currency: "usd", // TODO: Get from store settings
					product_data: {
						name: item.name,
						...(item.description && { description: item.description }),
						...(item.image && { images: [item.image] }),
					},
					unit_amount: Math.round(item.price * 100), // Convert to cents
				},
				quantity: item.quantity,
			})
		)

		// Add shipping as line item if present
		if (shippingAmount && shippingAmount > 0) {
			lineItems.push({
				price_data: {
					currency: "usd",
					product_data: {
						name: "Shipping",
					},
					unit_amount: Math.round(shippingAmount * 100),
				},
				quantity: 1,
			})
		}

		// Handle discount
		if (discountAmount && discountAmount > 0) {
			lineItems.push({
				price_data: {
					currency: "usd",
					product_data: {
						name: discountCode ? `Discount (${discountCode})` : "Discount",
					},
					unit_amount: -Math.round(discountAmount * 100), // Negative for discount
				},
				quantity: 1,
			})
		}

		// Create checkout session
		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			payment_method_types: ["card"],
			line_items: lineItems,
			success_url: successUrl,
			cancel_url: cancelUrl,
			...(email && { customer_email: email }),
			metadata: {
				...metadata,
				storefrontId: storefront.id,
				workspaceId: storefront.workspaceId,
			},
		})

		return Response.json({
			sessionId: session.id,
			url: session.url,
		})
	} catch (error) {
		console.error("Stripe checkout error:", error)
		const message = error instanceof Error ? error.message : "Failed to create checkout session"
		return storefrontError(message, 500)
	}
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
