import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, gte, lte, or, isNull } from "@quickdash/db/drizzle"
import { discounts } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

type ValidateInput = {
	code: string
	subtotal?: number
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: ValidateInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { code, subtotal = 0 } = body

	if (!code) {
		return storefrontError("Missing discount code", 400)
	}

	const now = new Date()

	// Find the discount code
	const [discount] = await db
		.select()
		.from(discounts)
		.where(
			and(
				eq(discounts.workspaceId, storefront.workspaceId),
				eq(discounts.code, code.toUpperCase()),
				eq(discounts.isActive, true),
				// Check date range
				or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
				or(isNull(discounts.expiresAt), gte(discounts.expiresAt, now))
			)
		)
		.limit(1)

	if (!discount) {
		return storefrontError("Invalid or expired discount code", 404)
	}

	// Check usage limits
	if (discount.maxUses && (discount.currentUses ?? 0) >= discount.maxUses) {
		return storefrontError("Discount code has reached its usage limit", 400)
	}

	// Check minimum order amount
	if (discount.minimumOrderAmount && subtotal < parseFloat(discount.minimumOrderAmount)) {
		return storefrontError(
			`Minimum order amount of $${discount.minimumOrderAmount} required`,
			400
		)
	}

	// Calculate discount amount
	let discountAmount = 0
	if (discount.valueType === "percentage") {
		discountAmount = (subtotal * parseFloat(discount.value)) / 100
	} else if (discount.valueType === "fixed") {
		discountAmount = Math.min(parseFloat(discount.value), subtotal)
	}

	return Response.json({
		valid: true,
		discount: {
			code: discount.code,
			type: discount.valueType,
			value: parseFloat(discount.value),
			discountAmount: Math.round(discountAmount * 100) / 100,
			name: discount.name,
		},
	})
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
