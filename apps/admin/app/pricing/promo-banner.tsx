"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { generateDeviceFingerprint } from "@/lib/fingerprint"
import { checkPromoEligibility, claimIntroOffer } from "./actions"

export function PromoBanner() {
	const [eligible, setEligible] = useState<boolean | null>(null)
	const [fingerprint, setFingerprint] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		async function check() {
			try {
				const fp = await generateDeviceFingerprint()
				setFingerprint(fp)
				const result = await checkPromoEligibility(fp)
				setEligible(result.eligible)
			} catch {
				setEligible(false)
			}
		}
		check()
	}, [])

	if (eligible !== true || !fingerprint) return null

	const handleClaim = async () => {
		try {
			setLoading(true)
			const checkoutUrl = await claimIntroOffer(fingerprint)
			window.location.href = checkoutUrl
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
			setLoading(false)
		}
	}

	return (
		<div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8">
			<div className="absolute -right-4 -top-4 size-32 rounded-full bg-primary/5 blur-3xl" />
			<div className="absolute -left-4 -bottom-4 size-24 rounded-full bg-primary/5 blur-2xl" />

			<div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<Sparkles className="size-4 text-primary" />
						<span className="text-xs font-semibold uppercase tracking-wider text-primary">
							Limited Time Offer
						</span>
					</div>
					<h3 className="text-lg font-bold">
						Get Pro for $5/month for 3 months
					</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Try every Pro feature — analytics, automation, API access, and more.
						After 3 months, continue at $20/month or switch to any plan.
					</p>
				</div>

				<button
					onClick={handleClaim}
					disabled={loading}
					className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
				>
					{loading ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Processing...
						</>
					) : (
						<>
							Claim Offer
							<ArrowRight className="size-3.5" />
						</>
					)}
				</button>
			</div>
		</div>
	)
}
