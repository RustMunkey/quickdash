"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, and, or } from "@quickdash/db/drizzle"
import { users, promotionalClaims, workspaces, TIER_LIMITS } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"
import { INTRO_PROMO_PRODUCT, POLAR_API_BASE } from "@/lib/polar"

/**
 * Check if a device fingerprint or user has already claimed the intro promo.
 * Returns eligibility status.
 */
export async function checkPromoEligibility(deviceFingerprint: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return { eligible: true, reason: null } // Not logged in = show the offer
	}

	const userId = session.user.id

	// Check if this user or this device has already claimed
	const existingClaims = await db
		.select({ id: promotionalClaims.id, userId: promotionalClaims.userId })
		.from(promotionalClaims)
		.where(
			and(
				eq(promotionalClaims.promoCode, INTRO_PROMO_PRODUCT.promoCode),
				or(
					eq(promotionalClaims.userId, userId),
					eq(promotionalClaims.deviceFingerprint, deviceFingerprint)
				)
			)
		)
		.limit(1)

	if (existingClaims.length > 0) {
		return {
			eligible: false,
			reason: existingClaims[0].userId === userId
				? "You've already claimed this offer."
				: "This offer has already been claimed on this device.",
		}
	}

	// Check if user is already on a paid plan
	const [user] = await db
		.select({ subscriptionTier: users.subscriptionTier })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	if (user && user.subscriptionTier !== "hobby") {
		return {
			eligible: false,
			reason: "This offer is only available for new users on the Hobby plan.",
		}
	}

	return { eligible: true, reason: null }
}

/**
 * Claim the introductory pricing offer.
 * Creates a Polar checkout for the discounted Essentials promo product and records the claim.
 */
export async function claimIntroOffer(deviceFingerprint: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Please sign in to claim this offer.")

	const userId = session.user.id

	// Validate fingerprint format (should be a SHA-256 hex string)
	if (!deviceFingerprint || !/^[a-f0-9]{64}$/.test(deviceFingerprint)) {
		throw new Error("Invalid request. Please try again.")
	}

	// Double-check eligibility
	const eligibility = await checkPromoEligibility(deviceFingerprint)
	if (!eligibility.eligible) {
		throw new Error(eligibility.reason || "You are not eligible for this offer.")
	}

	if (!INTRO_PROMO_PRODUCT.productId) {
		throw new Error("Promotional offer is not currently available. Please check back later.")
	}

	// Create Polar checkout for the promo product
	const response = await fetch(`${POLAR_API_BASE}/checkouts/`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			product_id: INTRO_PROMO_PRODUCT.productId,
			success_url: `${process.env.NEXT_PUBLIC_ADMIN_URL}/billing?success=true&promo=intro`,
			customer_email: session.user.email,
			metadata: {
				user_id: userId,
				promo_code: INTRO_PROMO_PRODUCT.promoCode,
				device_fingerprint: deviceFingerprint,
			},
		}),
	})

	if (!response.ok) {
		const err = await response.text()
		console.error("[Polar] Promo checkout creation failed:", err)
		throw new Error("Failed to create checkout. Please try again.")
	}

	const checkout = await response.json()

	// Record the claim (marked as pending until Polar webhook confirms)
	const now = new Date()
	const expiresAt = new Date(now)
	expiresAt.setMonth(expiresAt.getMonth() + INTRO_PROMO_PRODUCT.durationMonths)

	await db.insert(promotionalClaims).values({
		userId,
		promoCode: INTRO_PROMO_PRODUCT.promoCode,
		deviceFingerprint,
		tier: INTRO_PROMO_PRODUCT.tier,
		durationMonths: INTRO_PROMO_PRODUCT.durationMonths,
		pricePerMonth: INTRO_PROMO_PRODUCT.pricePerMonth,
		startsAt: now,
		expiresAt,
		isActive: false, // Will be activated by Polar webhook
	})

	return checkout.url as string
}

/**
 * Called by Polar webhook handler when an intro promo subscription is confirmed.
 * Activates the promo claim and upgrades the user.
 */
export async function activatePromoClaim(
	userId: string,
	polarSubscriptionId: string,
	promoCode: string
) {
	// Activate the claim
	await db
		.update(promotionalClaims)
		.set({
			isActive: true,
			polarSubscriptionId,
		})
		.where(
			and(
				eq(promotionalClaims.userId, userId),
				eq(promotionalClaims.promoCode, promoCode),
				eq(promotionalClaims.isActive, false)
			)
		)

	// Upgrade user to promo tier
	const tier = INTRO_PROMO_PRODUCT.tier
	const limits = TIER_LIMITS[tier]

	await db
		.update(users)
		.set({
			subscriptionTier: tier,
			subscriptionStatus: "active",
			polarSubscriptionId,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId))

	// Sync all owned workspaces
	await db
		.update(workspaces)
		.set({
			maxStorefronts: limits.storefronts,
			maxTeamMembers: limits.teamMembers,
			maxWidgets: limits.maxWidgets,
			maxSongs: limits.maxSongs,
			maxStations: limits.maxStations,
			features: limits.features,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.ownerId, userId))
}
