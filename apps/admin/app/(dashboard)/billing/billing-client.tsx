"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Check, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { createCheckoutUrl } from "./actions"
import type { SubscriptionTier, WorkspaceFeatures } from "@quickdash/db/schema"

type TierInfo = Record<SubscriptionTier, { name: string; price: number; description: string }>
type TierLimits = Record<SubscriptionTier, { workspaces: number; storefronts: number; teamMembers: number; features: WorkspaceFeatures }>

type MeteredUsage = {
	workflow_runs: number
	api_calls: number
	automations: number
}

type BillingInfo = {
	tier: SubscriptionTier
	tierName: string
	status: string
	polarSubscriptionId: string | null
	usage: {
		workspaces: { used: number; limit: number }
		storefronts: { used: number; limit: number }
		teamMembers: { used: number; limit: number }
	}
	metered: MeteredUsage
	features: WorkspaceFeatures
}

const DISPLAY_TIERS: SubscriptionTier[] = ["free", "lite", "pro", "max", "scale"]

const FEATURE_LABELS: Record<keyof WorkspaceFeatures, string> = {
	analytics: "Analytics",
	integrations: "Integrations",
	api: "API Access",
	automation: "Automation",
	whiteLabel: "White Label",
	customDomain: "Custom Domains",
}

export function BillingClient({
	billing,
	tiers,
	limits,
}: {
	billing: BillingInfo
	tiers: TierInfo
	limits: TierLimits
}) {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null)

	useEffect(() => {
		if (searchParams.get("success") === "true") {
			toast.success("Subscription updated successfully! Changes may take a moment to reflect.")
			router.replace("/billing")
		}
	}, [searchParams, router])

	const handleUpgrade = async (tier: SubscriptionTier) => {
		try {
			setLoadingTier(tier)
			const url = await createCheckoutUrl(tier)
			window.location.href = url
		} catch (error) {
			toast.error("Failed to create checkout session. Please try again.")
			setLoadingTier(null)
		}
	}

	const tierOrder: Record<SubscriptionTier, number> = {
		free: 0,
		lite: 1,
		pro: 2,
		max: 3,
		scale: 4,
		beta: 0, // beta is comped — treat as free-tier for upgrade purposes
	}

	const currentTierIndex = tierOrder[billing.tier]

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage your account subscription and monitor usage.
			</p>

			{/* Current Plan */}
			<Card>
				<CardHeader className="pb-3">
					<CardDescription>Current Plan</CardDescription>
					<CardTitle className="flex items-center gap-2">
						{billing.tierName}
						{billing.tier === "beta" && (
							<Badge variant="secondary" className="text-[10px]">Beta</Badge>
						)}
						<Badge
							variant={billing.status === "active" ? "secondary" : "destructive"}
							className="text-[10px]"
						>
							{billing.status === "active" ? "Active" : billing.status === "canceled" ? "Canceled" : billing.status === "past_due" ? "Past Due" : billing.status}
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{billing.status === "canceled"
							? "Your plan will downgrade at the end of the current billing period."
							: billing.status === "past_due"
								? "Your payment failed. Please update your payment method to avoid losing access."
								: tiers[billing.tier].description}
					</p>
				</CardContent>
			</Card>

			{/* Pricing Tiers */}
			<div>
				<h3 className="text-sm font-medium mb-3">Available Plans</h3>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{DISPLAY_TIERS.map((tier) => {
						const info = tiers[tier]
						const tierLimits = limits[tier]
						const isCurrent = billing.tier === tier
						const isRecommended = tier === "pro"
						const isUpgrade = tierOrder[tier] > currentTierIndex
						const isDowngrade = tierOrder[tier] < currentTierIndex

						return (
							<Card
								key={tier}
								className={`relative flex flex-col ${isRecommended ? "border-primary" : ""}`}
							>
								{isRecommended && (
									<Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
										Recommended
									</Badge>
								)}
								<CardHeader className="pb-2">
									<CardDescription className="text-xs">{info.description}</CardDescription>
									<CardTitle className="text-base">{info.name}</CardTitle>
									<div className="text-2xl font-bold tracking-tight">
										{info.price === 0
											? "$0"
											: info.price === -1
												? "Custom"
												: `$${info.price}`}
										{info.price > 0 && (
											<span className="text-xs font-normal text-muted-foreground">/mo</span>
										)}
									</div>
								</CardHeader>
								<CardContent className="flex flex-1 flex-col gap-3">
									{/* Resource limits */}
									<ul className="space-y-1.5 text-xs text-muted-foreground">
										<li className="flex items-center gap-1.5">
											<Check className="size-3 text-primary shrink-0" />
											{tierLimits.workspaces === -1
												? "Unlimited workspaces"
												: `${tierLimits.workspaces} ${tierLimits.workspaces === 1 ? "workspace" : "workspaces"}`}
										</li>
										<li className="flex items-center gap-1.5">
											<Check className="size-3 text-primary shrink-0" />
											{tierLimits.storefronts === -1
												? "Unlimited storefronts"
												: `${tierLimits.storefronts} ${tierLimits.storefronts === 1 ? "storefront" : "storefronts"} per workspace`}
										</li>
										<li className="flex items-center gap-1.5">
											<Check className="size-3 text-primary shrink-0" />
											{tierLimits.teamMembers === -1
												? "Unlimited team members"
												: `${tierLimits.teamMembers} team members per workspace`}
										</li>
										{/* Boolean features */}
										{(Object.keys(FEATURE_LABELS) as (keyof WorkspaceFeatures)[]).map((featureKey) => {
											const enabled = tierLimits.features[featureKey]
											if (!enabled) return null
											return (
												<li key={featureKey} className="flex items-center gap-1.5">
													<Check className="size-3 text-primary shrink-0" />
													{FEATURE_LABELS[featureKey]}
												</li>
											)
										})}
									</ul>

									{/* CTA */}
									<div className="mt-auto pt-2">
										{isCurrent ? (
											<Badge variant="secondary" className="w-full justify-center text-xs py-1.5">
												Current Plan
											</Badge>
										) : tier === "free" ? (
											isDowngrade ? (
												<Button
													size="sm"
													variant="outline"
													className="w-full text-xs"
													disabled
												>
													Downgrade
												</Button>
											) : null
										) : tier === "scale" ? (
											<Button
												size="sm"
												variant="outline"
												className="w-full text-xs"
												asChild
											>
												<a href="mailto:admin@quickdash.net">
													Schedule a Tour
													<ArrowRight className="size-3" />
												</a>
											</Button>
										) : isUpgrade ? (
											<Button
												size="sm"
												className="w-full text-xs"
												onClick={() => handleUpgrade(tier)}
												disabled={loadingTier !== null}
											>
												{loadingTier === tier ? (
													<>
														<Loader2 className="size-3 animate-spin" />
														Processing...
													</>
												) : (
													<>
														Upgrade
														<ArrowRight className="size-3" />
													</>
												)}
											</Button>
										) : (
											<Button
												size="sm"
												variant="outline"
												className="w-full text-xs"
												disabled
											>
												Downgrade
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>
			</div>

			{/* Usage */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Usage</CardTitle>
					<CardDescription>Current resource consumption for this billing period.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6 sm:grid-cols-3">
						<UsageItem
							label="Workspaces"
							used={billing.usage.workspaces.used}
							limit={billing.usage.workspaces.limit}
						/>
						<UsageItem
							label="Storefronts"
							used={billing.usage.storefronts.used}
							limit={billing.usage.storefronts.limit}
						/>
						<UsageItem
							label="Team Members"
							used={billing.usage.teamMembers.used}
							limit={billing.usage.teamMembers.limit}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Metered Usage */}
			{(billing.metered.workflow_runs > 0 || billing.metered.api_calls > 0) && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Metered Usage</CardTitle>
						<CardDescription>
							Cumulative usage across your account. Usage persists and is not reset monthly.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-3">
							<MeteredItem label="Workflow Runs" count={billing.metered.workflow_runs} />
							<MeteredItem label="API Calls" count={billing.metered.api_calls} />
							<MeteredItem label="Automations" count={billing.metered.automations} />
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

function UsageItem({ label, used, limit }: { label: string; used: number; limit: number }) {
	const isUnlimited = limit === -1
	const pct = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground">
					{used} / {isUnlimited ? "Unlimited" : limit}
				</span>
			</div>
			<Progress value={isUnlimited ? 0 : pct} className="h-2" />
		</div>
	)
}

function MeteredItem({ label, count }: { label: string; count: number }) {
	return (
		<div className="rounded-lg border p-3">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="mt-1 text-2xl font-bold tracking-tight">
				{count.toLocaleString()}
			</div>
		</div>
	)
}
