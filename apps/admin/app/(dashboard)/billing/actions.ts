"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, sql } from "@quickdash/db/drizzle"
import {
	workspaces,
	workspaceMembers,
	storefronts,
	users,
	TIER_INFO,
	TIER_LIMITS,
	type SubscriptionTier,
} from "@quickdash/db/schema"
import { TIER_POLAR_PRODUCT_ID, POLAR_API_BASE } from "@/lib/polar"
import { requireWorkspace, getUserSubscription } from "@/lib/workspace"
import { getUserUsageSummary } from "@/lib/metering"
import { auth } from "@/lib/auth"

export async function getBillingInfo() {
	const workspace = await requireWorkspace()
	const subscription = await getUserSubscription()

	// Count current workspace usage
	const [memberCount] = await db
		.select({ count: sql`count(*)::int` })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspace.id))

	const [storefrontCount] = await db
		.select({ count: sql`count(*)::int` })
		.from(storefronts)
		.where(eq(storefronts.workspaceId, workspace.id))

	// Count workspaces owned by user
	const [workspaceCount] = await db
		.select({ count: sql`count(*)::int` })
		.from(workspaces)
		.where(eq(workspaces.ownerId, workspace.userId))

	const tier = subscription.tier
	const limits = TIER_LIMITS[tier]
	const info = TIER_INFO[tier]

	// Get metered usage
	const meteredUsage = await getUserUsageSummary(workspace.userId)

	return {
		tier,
		tierName: info.name,
		status: subscription.status,
		polarSubscriptionId: subscription.polarSubscriptionId,
		usage: {
			workspaces: {
				used: (workspaceCount?.count as number) || 0,
				limit: limits.workspaces,
			},
			storefronts: {
				used: (storefrontCount?.count as number) || 0,
				limit: workspace.maxStorefronts,
			},
			teamMembers: {
				used: (memberCount?.count as number) || 0,
				limit: workspace.maxTeamMembers,
			},
		},
		metered: meteredUsage,
		features: workspace.features,
	}
}

export async function createCheckoutUrl(tier: SubscriptionTier) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	const productId = TIER_POLAR_PRODUCT_ID[tier]
	if (!productId) throw new Error("Invalid tier")

	const response = await fetch(`${POLAR_API_BASE}/checkouts/`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			product_id: productId,
			success_url: `${process.env.NEXT_PUBLIC_ADMIN_URL}/billing?success=true`,
			customer_email: session.user.email,
			metadata: {
				user_id: session.user.id,
			},
		}),
	})

	if (!response.ok) {
		const err = await response.text()
		console.error("[Polar] Checkout creation failed:", err)
		throw new Error("Failed to create checkout")
	}

	const checkout = await response.json()
	return checkout.url as string
}
