import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getSquareCredentials } from "@/lib/workspace-integrations"

type CheckoutItem = {
	name: string
	quantity: number
	amount: number // in dollars
	note?: string
}

type CheckoutInput = {
	items: CheckoutItem[]
	currency?: string
	successUrl?: string
	metadata?: Record<string, string>
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getSquareCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("Square not configured. Please contact the store owner.", 503)
	}

	let body: CheckoutInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { items, currency = "USD", successUrl, metadata } = body

	if (!items?.length) {
		return storefrontError("Missing required field: items", 400)
	}

	const baseUrl = creds.mode === "sandbox"
		? "https://connect.squareupsandbox.com"
		: "https://connect.squareup.com"

	try {
		// Build order line items for Square
		const lineItems = items.map((item) => ({
			name: item.name,
			quantity: String(item.quantity),
			base_price_money: {
				amount: Math.round(item.amount * 100), // Square uses cents
				currency: currency.toUpperCase(),
			},
			...(item.note && { note: item.note }),
		}))

		const payload: Record<string, unknown> = {
			idempotency_key: crypto.randomUUID(),
			order: {
				location_id: creds.locationId,
				line_items: lineItems,
			},
			checkout_options: {
				allow_tipping: false,
				redirect_url: successUrl || undefined,
				ask_for_shipping_address: true,
			},
		}

		const res = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${creds.accessToken}`,
				"Square-Version": "2024-01-18",
			},
			body: JSON.stringify(payload),
		})

		if (!res.ok) {
			const errorText = await res.text()
			console.error("Square checkout error:", errorText)
			return storefrontError("Failed to create Square checkout", 500)
		}

		const data = await res.json()
		const paymentLink = data.payment_link

		if (!paymentLink) {
			return storefrontError("Failed to create Square payment link", 500)
		}

		return Response.json({
			paymentLinkId: paymentLink.id,
			url: paymentLink.url || paymentLink.long_url,
			orderId: paymentLink.order_id || null,
		})
	} catch (error) {
		console.error("Square checkout error:", error)
		const message = error instanceof Error ? error.message : "Failed to create Square checkout"
		return storefrontError(message, 500)
	}
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
