import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql } from "@quickdash/db/drizzle"
import { referralCodes, referrals, users } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

// POST /api/storefront/referrals/apply
// Record a successful referral after an order is placed
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: {
		referralId: string
		orderId: string
		orderTotal: number
		discountApplied: number
		referredEmail: string
		referredName: string
	}
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	const { referralId, orderId, orderTotal, discountApplied, referredEmail, referredName } = body
	if (!referralId || !orderId || !referredEmail) {
		return Response.json({ error: "Missing required fields" }, { status: 400 })
	}

	// Find the referral code
	const [refCode] = await db
		.select()
		.from(referralCodes)
		.where(eq(referralCodes.id, referralId))
		.limit(1)

	if (!refCode) {
		return Response.json({ error: "Referral code not found" }, { status: 404 })
	}

	// Find or create the referred user
	let [referredUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, referredEmail.toLowerCase()))
		.limit(1)

	// If referred user doesn't exist yet (guest checkout), we still record the referral
	const referredId = referredUser?.id || "guest"

	// Calculate referrer reward (10% of order total as store credit)
	const rewardPercentage = 10
	const rewardAmount = (orderTotal * rewardPercentage) / 100

	// Create referral record
	await db.insert(referrals).values({
		workspaceId: storefront.workspaceId,
		referrerId: refCode.userId,
		referredId,
		referralCode: refCode.code,
		status: "completed",
		rewardAmount: String(rewardAmount),
		rewardType: "credit",
		completedAt: new Date(),
	})

	// Update referral code stats
	await db
		.update(referralCodes)
		.set({
			totalReferrals: sql`${referralCodes.totalReferrals} + 1`,
			totalEarnings: sql`COALESCE(${referralCodes.totalEarnings}, '0')::decimal + ${String(rewardAmount)}`,
		})
		.where(eq(referralCodes.id, referralId))

	return Response.json({
		success: true,
		referral: {
			referrerId: refCode.userId,
			referredEmail,
			rewardAmount: rewardAmount.toFixed(2),
			rewardType: "credit",
		},
	})
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
