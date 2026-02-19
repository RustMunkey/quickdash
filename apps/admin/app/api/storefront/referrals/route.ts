import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import { referralCodes, referrals, users } from "@quickdash/db/schema"
import { nanoid } from "nanoid"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

// GET /api/storefront/referrals?email=user@example.com
// Returns the referral code and stats for a customer
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const email = request.nextUrl.searchParams.get("email")
	if (!email) {
		return Response.json({ error: "Missing email parameter" }, { status: 400 })
	}

	// Find user by email
	const [user] = await db
		.select({ id: users.id, name: users.name })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)

	if (!user) {
		return Response.json({ referral: null })
	}

	// Find their referral code
	const [code] = await db
		.select()
		.from(referralCodes)
		.where(
			and(
				eq(referralCodes.workspaceId, storefront.workspaceId),
				eq(referralCodes.userId, user.id)
			)
		)
		.limit(1)

	if (!code) {
		return Response.json({ referral: null })
	}

	// Get recent conversions
	const recentConversions = await db
		.select({
			id: referrals.id,
			referredId: referrals.referredId,
			status: referrals.status,
			rewardAmount: referrals.rewardAmount,
			rewardType: referrals.rewardType,
			completedAt: referrals.completedAt,
			createdAt: referrals.createdAt,
		})
		.from(referrals)
		.where(
			and(
				eq(referrals.workspaceId, storefront.workspaceId),
				eq(referrals.referrerId, user.id)
			)
		)
		.orderBy(desc(referrals.createdAt))
		.limit(10)

	// Get referred user names
	const conversionsWithNames = await Promise.all(
		recentConversions.map(async (conv) => {
			const [referred] = await db
				.select({ name: users.name, email: users.email })
				.from(users)
				.where(eq(users.id, conv.referredId))
				.limit(1)
			return {
				id: conv.id,
				referredName: referred?.name || referred?.email || "Unknown",
				orderTotal: "0",
				discountApplied: "0",
				referrerReward: conv.rewardAmount || "0",
				referrerRewardStatus: conv.status,
				createdAt: conv.createdAt.toISOString(),
			}
		})
	)

	return Response.json({
		referral: {
			code: code.code,
			referrerEmail: email,
			referrerName: user.name,
			timesUsed: code.totalReferrals || 0,
			totalRewardsEarned: code.totalEarnings || "0",
			referrerRewardType: "credit",
			referrerRewardValue: "10",
			referredDiscountType: "percentage",
			referredDiscountValue: "10",
			isActive: true,
			expiresAt: null,
			createdAt: code.createdAt.toISOString(),
			recentConversions: conversionsWithNames,
		},
	})
}

// POST /api/storefront/referrals
// Generate a referral code for a customer
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: { email: string }
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	const { email } = body
	if (!email) {
		return Response.json({ error: "Missing email" }, { status: 400 })
	}

	// Find user
	const [user] = await db
		.select({ id: users.id, name: users.name })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)

	if (!user) {
		return Response.json({ error: "User not found" }, { status: 404 })
	}

	// Check if they already have a code
	const [existing] = await db
		.select()
		.from(referralCodes)
		.where(
			and(
				eq(referralCodes.workspaceId, storefront.workspaceId),
				eq(referralCodes.userId, user.id)
			)
		)
		.limit(1)

	if (existing) {
		return Response.json({
			referral: {
				code: existing.code,
				referrerEmail: email,
				referrerName: user.name,
				timesUsed: existing.totalReferrals || 0,
				totalRewardsEarned: existing.totalEarnings || "0",
				isActive: true,
				createdAt: existing.createdAt.toISOString(),
			},
		})
	}

	// Generate unique code
	const code = `REF-${nanoid(8).toUpperCase()}`

	const [newCode] = await db
		.insert(referralCodes)
		.values({
			workspaceId: storefront.workspaceId,
			userId: user.id,
			code,
		})
		.returning()

	return Response.json({
		referral: {
			code: newCode.code,
			referrerEmail: email,
			referrerName: user.name,
			timesUsed: 0,
			totalRewardsEarned: "0",
			isActive: true,
			createdAt: newCode.createdAt.toISOString(),
		},
	})
}

export const GET = withStorefrontAuth(handleGet)
export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
