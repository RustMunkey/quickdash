import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { referralCodes, users } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

// POST /api/storefront/referrals/validate
// Validate a referral code and return discount info
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: { code: string; customerEmail?: string; orderTotal?: number }
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	const { code, customerEmail, orderTotal } = body
	if (!code) {
		return Response.json({ error: "Missing code" }, { status: 400 })
	}

	// Find the referral code
	const [refCode] = await db
		.select({
			id: referralCodes.id,
			code: referralCodes.code,
			userId: referralCodes.userId,
			workspaceId: referralCodes.workspaceId,
		})
		.from(referralCodes)
		.where(
			and(
				eq(referralCodes.workspaceId, storefront.workspaceId),
				eq(referralCodes.code, code)
			)
		)
		.limit(1)

	if (!refCode) {
		return Response.json({ valid: false, error: "Invalid referral code" })
	}

	// Get referrer info
	const [referrer] = await db
		.select({ name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, refCode.userId))
		.limit(1)

	// Prevent self-referral
	if (customerEmail && referrer?.email?.toLowerCase() === customerEmail.toLowerCase()) {
		return Response.json({ valid: false, error: "Cannot use your own referral code" })
	}

	// Calculate discount (10% off for referred customer — configurable later)
	const discountPercentage = 10
	const discountAmount = orderTotal ? (orderTotal * discountPercentage) / 100 : 0

	return Response.json({
		valid: true,
		discount: {
			code,
			type: "percentage",
			value: discountPercentage,
			amount: discountAmount,
			free_shipping: false,
			isReferral: true,
			referralId: refCode.id,
			referrerName: referrer?.name || "A friend",
			description: `${discountPercentage}% off from ${referrer?.name || "a friend"}'s referral`,
		},
	})
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
