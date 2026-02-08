import type { SubscriptionTier } from "@quickdash/db/schema"

// Polar product IDs — configured via env vars so sandbox/production just work
const FREE_PRODUCT_ID = process.env.POLAR_FREE_PRODUCT_ID || ""
const LITE_PRODUCT_ID = process.env.POLAR_LITE_PRODUCT_ID || ""
const PRO_PRODUCT_ID = process.env.POLAR_PRO_PRODUCT_ID || ""
const MAX_PRODUCT_ID = process.env.POLAR_MAX_PRODUCT_ID || ""
const INTRO_PROMO_PRODUCT_ID = process.env.POLAR_INTRO_PROMO_PRODUCT_ID || ""

// Map Polar product ID → internal tier
export const POLAR_PRODUCT_IDS: Record<string, SubscriptionTier> = {
	...(FREE_PRODUCT_ID ? { [FREE_PRODUCT_ID]: "free" } : {}),
	...(LITE_PRODUCT_ID ? { [LITE_PRODUCT_ID]: "lite" } : {}),
	...(PRO_PRODUCT_ID ? { [PRO_PRODUCT_ID]: "pro" } : {}),
	...(MAX_PRODUCT_ID ? { [MAX_PRODUCT_ID]: "max" } : {}),
	...(INTRO_PROMO_PRODUCT_ID ? { [INTRO_PROMO_PRODUCT_ID]: "pro" } : {}),
}

// Map tier → Polar product ID (for creating checkouts)
export const TIER_POLAR_PRODUCT_ID: Partial<Record<SubscriptionTier, string>> = {
	...(LITE_PRODUCT_ID ? { lite: LITE_PRODUCT_ID } : {}),
	...(PRO_PRODUCT_ID ? { pro: PRO_PRODUCT_ID } : {}),
	...(MAX_PRODUCT_ID ? { max: MAX_PRODUCT_ID } : {}),
}

// Intro promo product ID (separate $5/mo product for 3 months)
export const INTRO_PROMO_PRODUCT = {
	productId: INTRO_PROMO_PRODUCT_ID,
	tier: "pro" as SubscriptionTier,
	durationMonths: 3,
	pricePerMonth: 500, // cents
	promoCode: "intro_pro_3mo",
}

// Polar API base URL — sandbox vs production
export const POLAR_API_BASE = process.env.POLAR_API_BASE || "https://api.polar.sh/v1"

export function resolveSubscriptionTier(polarProductId: string): SubscriptionTier {
	return POLAR_PRODUCT_IDS[polarProductId] || "free"
}
