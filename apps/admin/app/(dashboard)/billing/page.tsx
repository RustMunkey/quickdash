import { getBillingInfo } from "./actions"
import { BillingClient } from "./billing-client"
import { TIER_INFO, TIER_LIMITS } from "@quickdash/db/schema"

export default async function BillingPage() {
	const billing = await getBillingInfo()
	return <BillingClient billing={billing} tiers={TIER_INFO} limits={TIER_LIMITS} />
}
