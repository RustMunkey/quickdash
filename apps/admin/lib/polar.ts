import type { SubscriptionTier } from "@quickdash/db/schema"

// Polar product IDs — configured via env vars so sandbox/production just work
const LITE_PRODUCT_ID = process.env.POLAR_LITE_PRODUCT_ID || ""
const ESSENTIALS_PRODUCT_ID = process.env.POLAR_ESSENTIALS_PRODUCT_ID || ""
const PRO_PRODUCT_ID = process.env.POLAR_PRO_PRODUCT_ID || ""
const INTRO_PROMO_PRODUCT_ID = process.env.POLAR_INTRO_PROMO_PRODUCT_ID || ""

// Map Polar product ID → internal tier
export const POLAR_PRODUCT_IDS: Record<string, SubscriptionTier> = {
	...(LITE_PRODUCT_ID ? { [LITE_PRODUCT_ID]: "lite" } : {}),
	...(ESSENTIALS_PRODUCT_ID ? { [ESSENTIALS_PRODUCT_ID]: "essentials" } : {}),
	...(PRO_PRODUCT_ID ? { [PRO_PRODUCT_ID]: "pro" } : {}),
	// Intro promo maps to essentials tier (discounted 3-month trial)
	...(INTRO_PROMO_PRODUCT_ID ? { [INTRO_PROMO_PRODUCT_ID]: "essentials" } : {}),
}

// Map tier → Polar product ID (for creating checkouts)
export const TIER_POLAR_PRODUCT_ID: Partial<Record<SubscriptionTier, string>> = {
	...(LITE_PRODUCT_ID ? { lite: LITE_PRODUCT_ID } : {}),
	...(ESSENTIALS_PRODUCT_ID ? { essentials: ESSENTIALS_PRODUCT_ID } : {}),
	...(PRO_PRODUCT_ID ? { pro: PRO_PRODUCT_ID } : {}),
}

// Introductory pricing: 3 months of Essentials at a discounted rate
// Device fingerprinting + user check prevents sybil/promo abuse
export const INTRO_PROMO_PRODUCT = {
	productId: INTRO_PROMO_PRODUCT_ID,
	promoCode: "intro_essentials_3mo",
	tier: "essentials" as SubscriptionTier,
	durationMonths: 3,
	pricePerMonth: 15, // $15/mo for 3 months instead of $50/mo — update when final price decided
}

// Polar API base URL — sandbox vs production
export const POLAR_API_BASE = process.env.POLAR_API_BASE || "https://api.polar.sh/v1"

export function resolveSubscriptionTier(polarProductId: string): SubscriptionTier {
	return POLAR_PRODUCT_IDS[polarProductId] || "hobby"
}
