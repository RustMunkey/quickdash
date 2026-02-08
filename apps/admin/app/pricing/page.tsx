import type { Metadata } from "next"
import { TIER_INFO, TIER_LIMITS, type SubscriptionTier, type WorkspaceFeatures } from "@quickdash/db/schema"
import { Check, X, ArrowRight, Minus } from "lucide-react"
import Link from "next/link"
import { PromoBanner } from "./promo-banner"

export const metadata: Metadata = {
	title: "Pricing — Quickdash",
	description: "Simple, transparent pricing. Pick a plan that fits your business.",
}

const DISPLAY_TIERS: SubscriptionTier[] = ["free", "lite", "pro", "max"]

const FEATURE_ROWS: {
	label: string
	type: "limit" | "feature"
	getValue: (tier: SubscriptionTier) => string | boolean
}[] = [
	{
		label: "Workspaces",
		type: "limit",
		getValue: (tier) => {
			const v = TIER_LIMITS[tier].workspaces
			return v === -1 ? "Unlimited" : String(v)
		},
	},
	{
		label: "Storefronts per workspace",
		type: "limit",
		getValue: (tier) => {
			const v = TIER_LIMITS[tier].storefronts
			return v === -1 ? "Unlimited" : String(v)
		},
	},
	{
		label: "Team members per workspace",
		type: "limit",
		getValue: (tier) => {
			const v = TIER_LIMITS[tier].teamMembers
			return v === -1 ? "Unlimited" : String(v)
		},
	},
	{
		label: "Analytics & Reports",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.analytics,
	},
	{
		label: "Integrations",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.integrations,
	},
	{
		label: "API Access",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.api,
	},
	{
		label: "Automation & Workflows",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.automation,
	},
	{
		label: "White Label",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.whiteLabel,
	},
	{
		label: "Custom Domains",
		type: "feature",
		getValue: (tier) => TIER_LIMITS[tier].features.customDomain,
	},
	{
		label: "Products & Inventory",
		type: "feature",
		getValue: () => true,
	},
	{
		label: "Orders & Fulfillment",
		type: "feature",
		getValue: () => true,
	},
	{
		label: "Customer Management",
		type: "feature",
		getValue: () => true,
	},
	{
		label: "Storefront API (read-only)",
		type: "feature",
		getValue: () => true,
	},
	{
		label: "Email Support",
		type: "feature",
		getValue: () => true,
	},
	{
		label: "Priority Support",
		type: "feature",
		getValue: (tier) => tier === "pro" || tier === "max",
	},
	{
		label: "Dedicated Account Manager",
		type: "feature",
		getValue: (tier) => tier === "max",
	},
]

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Header */}
			<header className="border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<Link href="/" className="font-[family-name:var(--font-rubik-mono)] text-lg tracking-tight">
						quickdash
					</Link>
					<div className="flex items-center gap-3">
						<Link
							href="/login"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Log in
						</Link>
						<Link
							href="/signup"
							className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
						>
							Get Started
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="mx-auto max-w-6xl px-6 py-16 text-center">
				<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
					Simple, transparent pricing
				</h1>
				<p className="mt-3 text-muted-foreground max-w-lg mx-auto">
					Start free. Upgrade when you need more. No hidden fees, no surprises.
				</p>
			</section>

			{/* Promo Banner */}
			<section className="mx-auto max-w-6xl px-6 pb-8">
				<PromoBanner />
			</section>

			{/* Pricing Cards */}
			<section className="mx-auto max-w-6xl px-6 pb-16">
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{DISPLAY_TIERS.map((tier) => {
						const info = TIER_INFO[tier]
						const limits = TIER_LIMITS[tier]
						const isPopular = tier === "pro"

						return (
							<div
								key={tier}
								className={`relative flex flex-col rounded-xl border bg-card p-6 ${
									isPopular ? "border-primary ring-1 ring-primary" : ""
								}`}
							>
								{isPopular && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-[11px] font-medium text-primary-foreground">
											Most Popular
										</span>
									</div>
								)}

								<div className="mb-4">
									<h3 className="text-lg font-semibold">{info.name}</h3>
									<p className="mt-1 text-xs text-muted-foreground">{info.description}</p>
								</div>

								<div className="mb-6">
									<span className="text-4xl font-bold tracking-tight">
										{info.price === 0 ? "$0" : `$${info.price}`}
									</span>
									{info.price > 0 && (
										<span className="text-sm text-muted-foreground">/month</span>
									)}
								</div>

								<ul className="mb-6 space-y-2.5 text-sm flex-1">
									<li className="flex items-center gap-2">
										<Check className="size-4 text-primary shrink-0" />
										<span>
											{limits.workspaces === -1
												? "Unlimited workspaces"
												: `${limits.workspaces} workspace${limits.workspaces === 1 ? "" : "s"}`}
										</span>
									</li>
									<li className="flex items-center gap-2">
										<Check className="size-4 text-primary shrink-0" />
										<span>
											{limits.storefronts === -1
												? "Unlimited storefronts"
												: `${limits.storefronts} storefront${limits.storefronts === 1 ? "" : "s"} / workspace`}
										</span>
									</li>
									<li className="flex items-center gap-2">
										<Check className="size-4 text-primary shrink-0" />
										<span>
											{limits.teamMembers === -1
												? "Unlimited team members"
												: `${limits.teamMembers} team members / workspace`}
										</span>
									</li>
									{(Object.entries(limits.features) as [keyof WorkspaceFeatures, boolean][]).map(
										([key, enabled]) =>
											enabled && (
												<li key={key} className="flex items-center gap-2">
													<Check className="size-4 text-primary shrink-0" />
													<span>
														{key === "api"
															? "API Access"
															: key === "whiteLabel"
																? "White Label"
																: key === "customDomain"
																	? "Custom Domains"
																	: key.charAt(0).toUpperCase() + key.slice(1)}
													</span>
												</li>
											)
									)}
								</ul>

								<Link
									href={tier === "free" ? "/signup" : "/signup"}
									className={`inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${
										isPopular
											? "bg-primary text-primary-foreground hover:bg-primary/90"
											: "border bg-background hover:bg-accent hover:text-accent-foreground"
									}`}
								>
									{tier === "free" ? "Get Started" : "Start Free Trial"}
									<ArrowRight className="size-3.5" />
								</Link>
							</div>
						)
					})}
				</div>

				{/* Scale / Enterprise */}
				<div className="mt-8 rounded-xl border bg-card p-6 text-center">
					<h3 className="text-lg font-semibold">Scale</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Need custom limits, SLAs, or dedicated infrastructure? Let&apos;s talk.
					</p>
					<a
						href="mailto:admin@quickdash.net"
						className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg border bg-background px-6 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
					>
						Contact Sales
						<ArrowRight className="size-3.5" />
					</a>
				</div>
			</section>

			{/* Feature Comparison Table */}
			<section className="mx-auto max-w-6xl px-6 pb-20">
				<h2 className="text-xl font-bold tracking-tight text-center mb-8">
					Compare all features
				</h2>

				<div className="overflow-x-auto rounded-xl border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="px-4 py-3 text-left font-medium text-muted-foreground w-[280px]">
									Feature
								</th>
								{DISPLAY_TIERS.map((tier) => (
									<th key={tier} className="px-4 py-3 text-center font-medium min-w-[120px]">
										{TIER_INFO[tier].name}
										<div className="text-xs font-normal text-muted-foreground mt-0.5">
											{TIER_INFO[tier].price === 0
												? "Free"
												: `$${TIER_INFO[tier].price}/mo`}
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{FEATURE_ROWS.map((row, i) => (
								<tr
									key={row.label}
									className={i < FEATURE_ROWS.length - 1 ? "border-b" : ""}
								>
									<td className="px-4 py-3 text-muted-foreground">{row.label}</td>
									{DISPLAY_TIERS.map((tier) => {
										const value = row.getValue(tier)
										return (
											<td key={tier} className="px-4 py-3 text-center">
												{typeof value === "boolean" ? (
													value ? (
														<Check className="size-4 text-primary mx-auto" />
													) : (
														<Minus className="size-4 text-muted-foreground/40 mx-auto" />
													)
												) : (
													<span className="font-medium">{value}</span>
												)}
											</td>
										)
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* FAQ */}
			<section className="border-t bg-muted/30">
				<div className="mx-auto max-w-3xl px-6 py-16">
					<h2 className="text-xl font-bold tracking-tight text-center mb-8">
						Frequently asked questions
					</h2>
					<div className="space-y-6">
						<FaqItem
							question="Can I change plans at any time?"
							answer="Yes. You can upgrade or downgrade at any time from your billing settings. When upgrading, you'll be charged the prorated difference. When downgrading, the change takes effect at the end of your billing period."
						/>
						<FaqItem
							question="What happens if I exceed my limits?"
							answer="You won't lose access to anything. We'll notify you when you're approaching limits and suggest upgrading. You simply won't be able to create new resources beyond your plan's limits until you upgrade."
						/>
						<FaqItem
							question="Is there a free trial?"
							answer="The Free plan is always free — no credit card required. You can explore the platform and upgrade when you're ready for more features."
						/>
						<FaqItem
							question="What payment methods do you accept?"
							answer="We accept all major credit and debit cards through our payment processor, Polar. You can also pay with Apple Pay and Google Pay."
						/>
						<FaqItem
							question="Can I cancel anytime?"
							answer="Absolutely. No contracts, no cancellation fees. When you cancel, you keep access to your current plan until the end of the billing period."
						/>
						<FaqItem
							question="What are storefronts?"
							answer="Storefronts are external websites or apps that connect to your Quickdash workspace via API. Each storefront gets its own API key with configurable permissions, allowing you to power multiple online stores from a single workspace."
						/>
						<FaqItem
							question="Do limits apply per workspace or per account?"
							answer="Workspace count is per account. Storefronts and team members are per workspace. For example, on the Pro plan you can have up to 10 workspaces, and each workspace can have up to 10 storefronts and 100 team members."
						/>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t">
				<div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-xs text-muted-foreground">
					<span>&copy; {new Date().getFullYear()} Quickdash. All rights reserved.</span>
					<Link href="/login" className="hover:text-foreground transition-colors">
						Log in
					</Link>
				</div>
			</footer>
		</div>
	)
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
	return (
		<div>
			<h3 className="font-medium text-sm">{question}</h3>
			<p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{answer}</p>
		</div>
	)
}
