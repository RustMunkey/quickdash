import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getShopifyCredentials } from "@/lib/workspace-integrations"

type CheckoutItem = {
	variantId: string // Shopify variant GID
	quantity: number
}

type CheckoutInput = {
	items: CheckoutItem[]
	email?: string
	note?: string
	metadata?: Record<string, string>
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getShopifyCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("Shopify not configured. Please contact the store owner.", 503)
	}

	let body: CheckoutInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { items, email, note } = body

	if (!items?.length) {
		return storefrontError("Missing required field: items", 400)
	}

	const storeDomain = creds.storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")

	try {
		// Use Shopify Storefront API to create a checkout
		const mutation = `
			mutation checkoutCreate($input: CheckoutCreateInput!) {
				checkoutCreate(input: $input) {
					checkout {
						id
						webUrl
					}
					checkoutUserErrors {
						code
						field
						message
					}
				}
			}
		`

		const input: Record<string, unknown> = {
			lineItems: items.map((item) => ({
				variantId: item.variantId.startsWith("gid://")
					? item.variantId
					: `gid://shopify/ProductVariant/${item.variantId}`,
				quantity: item.quantity,
			})),
		}

		if (email) input.email = email
		if (note) input.note = note

		const res = await fetch(`https://${storeDomain}/api/2024-01/graphql.json`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Storefront-Access-Token": creds.storefrontToken,
			},
			body: JSON.stringify({ query: mutation, variables: { input } }),
		})

		if (!res.ok) {
			const errorText = await res.text()
			console.error("Shopify checkout error:", errorText)
			return storefrontError("Failed to create Shopify checkout", 500)
		}

		const data = await res.json()
		const checkout = data.data?.checkoutCreate?.checkout
		const errors = data.data?.checkoutCreate?.checkoutUserErrors

		if (errors?.length) {
			console.error("Shopify checkout errors:", errors)
			return storefrontError(errors[0].message || "Failed to create Shopify checkout", 400)
		}

		if (!checkout) {
			return storefrontError("Failed to create Shopify checkout", 500)
		}

		return Response.json({
			checkoutId: checkout.id,
			webUrl: checkout.webUrl,
		})
	} catch (error) {
		console.error("Shopify checkout error:", error)
		const message = error instanceof Error ? error.message : "Failed to create Shopify checkout"
		return storefrontError(message, 500)
	}
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
