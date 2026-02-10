import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getPayPalCredentials, markIntegrationUsed } from "@/lib/workspace-integrations"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations } from "@quickdash/db/schema"

type PayPalOrderItem = {
	name: string
	quantity: number
	unitAmount: number // in dollars
	description?: string
}

type CreateOrderInput = {
	items: PayPalOrderItem[]
	currency?: string
	successUrl: string
	cancelUrl: string
	shippingAmount?: number
	discountAmount?: number
	metadata?: Record<string, string>
}

type CaptureOrderInput = {
	orderId: string
}

/**
 * Get PayPal OAuth2 access token using client credentials
 */
async function getPayPalAccessToken(
	clientId: string,
	clientSecret: string,
	mode: "sandbox" | "live"
): Promise<string> {
	const baseUrl =
		mode === "sandbox"
			? "https://api-m.sandbox.paypal.com"
			: "https://api-m.paypal.com"

	const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
		},
		body: "grant_type=client_credentials",
	})

	if (!res.ok) {
		const text = await res.text()
		throw new Error(`PayPal OAuth failed: ${res.status} ${text}`)
	}

	const data = await res.json()
	return data.access_token
}

function getPayPalBaseUrl(mode: "sandbox" | "live"): string {
	return mode === "sandbox"
		? "https://api-m.sandbox.paypal.com"
		: "https://api-m.paypal.com"
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getPayPalCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("PayPal not configured. Please contact the store owner.", 503)
	}

	let body: CreateOrderInput | CaptureOrderInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	// Route to create or capture based on request body
	if ("orderId" in body) {
		return captureOrder(body as CaptureOrderInput, creds, storefront)
	}
	return createOrder(body as CreateOrderInput, creds, storefront)
}

async function createOrder(
	body: CreateOrderInput,
	creds: { clientId: string; clientSecret: string; mode: "sandbox" | "live" },
	storefront: StorefrontContext
) {
	const { items, currency = "USD", successUrl, cancelUrl, shippingAmount, discountAmount, metadata } = body

	if (!items?.length || !successUrl || !cancelUrl) {
		return storefrontError("Missing required fields: items, successUrl, cancelUrl", 400)
	}

	try {
		const accessToken = await getPayPalAccessToken(creds.clientId, creds.clientSecret, creds.mode)
		const baseUrl = getPayPalBaseUrl(creds.mode)

		// Calculate totals
		const itemTotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
		const shipping = shippingAmount || 0
		const discount = discountAmount || 0
		const total = itemTotal + shipping - discount

		const purchaseUnit: Record<string, unknown> = {
			amount: {
				currency_code: currency.toUpperCase(),
				value: total.toFixed(2),
				breakdown: {
					item_total: { currency_code: currency.toUpperCase(), value: itemTotal.toFixed(2) },
					shipping: { currency_code: currency.toUpperCase(), value: shipping.toFixed(2) },
					discount: { currency_code: currency.toUpperCase(), value: discount.toFixed(2) },
				},
			},
			items: items.map((item) => ({
				name: item.name,
				quantity: String(item.quantity),
				unit_amount: {
					currency_code: currency.toUpperCase(),
					value: item.unitAmount.toFixed(2),
				},
				...(item.description && { description: item.description }),
			})),
		}

		const orderPayload = {
			intent: "CAPTURE",
			purchase_units: [purchaseUnit],
			application_context: {
				return_url: successUrl,
				cancel_url: cancelUrl,
				shipping_preference: "GET_FROM_FILE", // PayPal collects the address
				user_action: "PAY_NOW",
			},
		}

		const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(orderPayload),
		})

		if (!res.ok) {
			const errorText = await res.text()
			console.error("PayPal create order error:", errorText)
			return storefrontError("Failed to create PayPal order", 500)
		}

		const order = await res.json()
		const approveLink = order.links?.find((l: { rel: string }) => l.rel === "approve")

		return Response.json({
			orderId: order.id,
			approveUrl: approveLink?.href || null,
			status: order.status,
		})
	} catch (error) {
		console.error("PayPal create order error:", error)
		const message = error instanceof Error ? error.message : "Failed to create PayPal order"
		return storefrontError(message, 500)
	}
}

async function captureOrder(
	body: CaptureOrderInput,
	creds: { clientId: string; clientSecret: string; mode: "sandbox" | "live" },
	storefront: StorefrontContext
) {
	const { orderId } = body

	if (!orderId) {
		return storefrontError("Missing orderId", 400)
	}

	try {
		const accessToken = await getPayPalAccessToken(creds.clientId, creds.clientSecret, creds.mode)
		const baseUrl = getPayPalBaseUrl(creds.mode)

		const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
		})

		if (!res.ok) {
			const errorText = await res.text()
			console.error("PayPal capture error:", errorText)
			return storefrontError("Failed to capture PayPal payment", 500)
		}

		const capture = await res.json()
		const captureDetail = capture.purchase_units?.[0]?.payments?.captures?.[0]
		const payer = capture.payer
		const shipping = capture.purchase_units?.[0]?.shipping

		return Response.json({
			captureId: captureDetail?.id || null,
			status: capture.status,
			payer: payer
				? {
						email: payer.email_address,
						name: payer.name ? `${payer.name.given_name} ${payer.name.surname}` : null,
					}
				: null,
			shippingAddress: shipping?.address
				? {
						name: shipping.name?.full_name || null,
						addressLine1: shipping.address.address_line_1 || null,
						addressLine2: shipping.address.address_line_2 || null,
						city: shipping.address.admin_area_2 || null,
						state: shipping.address.admin_area_1 || null,
						postalCode: shipping.address.postal_code || null,
						country: shipping.address.country_code || null,
					}
				: null,
			amount: captureDetail?.amount?.value || null,
			currency: captureDetail?.amount?.currency_code || null,
		})
	} catch (error) {
		console.error("PayPal capture error:", error)
		const message = error instanceof Error ? error.message : "Failed to capture PayPal payment"
		return storefrontError(message, 500)
	}
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
