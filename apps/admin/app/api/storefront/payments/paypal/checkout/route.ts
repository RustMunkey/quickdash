import type { NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getPayPalCredentials } from "@/lib/workspace-integrations"
import { getPayPalAccessToken, getPayPalBaseUrl, type PayPalCredentials } from "@/lib/paypal"
import { createCheckoutQuote } from "@/lib/storefront-checkout-quote"

type PayPalOrderItem = {
	variantId: string
	quantity: number
}

type CreateOrderInput = {
	items: PayPalOrderItem[]
	successUrl: string
	cancelUrl: string
	country: string
	state?: string
	discountCode?: string
	customerEmail?: string
	checkoutAttemptId?: string
}

type CaptureOrderInput = {
	orderId: string
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
		return captureOrder(body as CaptureOrderInput, creds)
	}
	return createOrder(body as CreateOrderInput, creds, storefront)
}

async function createOrder(
	body: CreateOrderInput,
	creds: PayPalCredentials,
	storefront: StorefrontContext
) {
	const { items, successUrl, cancelUrl, country, state, discountCode, customerEmail, checkoutAttemptId } = body

	if (!items?.length || !successUrl || !cancelUrl || !country) {
		return storefrontError("Missing required checkout fields", 400)
	}

	try {
		const quote = await createCheckoutQuote(storefront.workspaceId, {
			items,
			country,
			state,
			discountCode,
			customerEmail,
		})
		const accessToken = await getPayPalAccessToken(creds)
		const baseUrl = getPayPalBaseUrl(creds.mode)

		const purchaseUnit: Record<string, unknown> = {
			...(checkoutAttemptId ? { custom_id: checkoutAttemptId } : {}),
			amount: {
				currency_code: quote.currency,
				value: quote.total.toFixed(2),
				breakdown: {
					item_total: { currency_code: quote.currency, value: quote.subtotal.toFixed(2) },
					shipping: { currency_code: quote.currency, value: quote.shippingAmount.toFixed(2) },
					discount: { currency_code: quote.currency, value: quote.discountAmount.toFixed(2) },
				},
			},
			items: quote.items.map((item) => ({
				name: item.name,
				quantity: String(item.quantity),
				sku: item.variantId,
				unit_amount: {
					currency_code: quote.currency,
					value: item.unitAmount.toFixed(2),
				},
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
			quote,
		})
	} catch (error) {
		console.error("PayPal create order error:", error)
		const message = error instanceof Error ? error.message : "Failed to create PayPal order"
		return storefrontError(message, 500)
	}
}

async function captureOrder(
	body: CaptureOrderInput,
	creds: PayPalCredentials
) {
	const { orderId } = body

	if (!orderId) {
		return storefrontError("Missing orderId", 400)
	}

	try {
		const accessToken = await getPayPalAccessToken(creds)
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
