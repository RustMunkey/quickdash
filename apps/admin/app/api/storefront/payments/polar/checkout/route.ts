import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getPolarCredentials } from "@/lib/workspace-integrations"

type CheckoutInput = {
	productId?: string
	amount?: number
	currency?: string
	productName?: string
	successUrl: string
	cancelUrl?: string
	customerEmail?: string
	metadata?: Record<string, string>
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getPolarCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("Polar not configured. Please contact the store owner.", 503)
	}

	let body: CheckoutInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { productId, amount, currency = "USD", productName, successUrl, cancelUrl, customerEmail, metadata } = body

	if (!successUrl) {
		return storefrontError("Missing required field: successUrl", 400)
	}

	if (!productId && !amount) {
		return storefrontError("Must provide either productId or amount", 400)
	}

	const baseUrl = creds.mode === "sandbox"
		? "https://sandbox-api.polar.sh"
		: "https://api.polar.sh"

	try {
		// Build checkout payload
		const checkoutPayload: Record<string, unknown> = {
			success_url: successUrl,
			...(customerEmail && { customer_email: customerEmail }),
			metadata: {
				...metadata,
				storefrontId: storefront.id,
				workspaceId: storefront.workspaceId,
			},
		}

		if (productId) {
			// Checkout for an existing Polar product
			checkoutPayload.product_id = productId
		} else if (amount) {
			// Custom amount checkout
			checkoutPayload.amount = Math.round(amount * 100) // Polar uses cents
			checkoutPayload.currency = currency.toLowerCase()
			if (productName) {
				checkoutPayload.product_name = productName
			}
		}

		const res = await fetch(`${baseUrl}/v1/checkouts/custom`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${creds.accessToken}`,
			},
			body: JSON.stringify(checkoutPayload),
		})

		if (!res.ok) {
			const errorText = await res.text()
			console.error("Polar checkout error:", errorText)
			return storefrontError("Failed to create Polar checkout", 500)
		}

		const checkout = await res.json()

		return Response.json({
			checkoutId: checkout.id,
			url: checkout.url,
			status: checkout.status,
		})
	} catch (error) {
		console.error("Polar checkout error:", error)
		const message = error instanceof Error ? error.message : "Failed to create Polar checkout"
		return storefrontError(message, 500)
	}
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
