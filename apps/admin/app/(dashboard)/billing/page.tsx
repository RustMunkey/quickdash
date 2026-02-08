"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function BillingPage() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage your subscription, invoices, and payment methods.
			</p>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{/* Current Plan */}
				<Card>
					<CardHeader className="pb-3">
						<CardDescription>Current Plan</CardDescription>
						<CardTitle className="flex items-center gap-2">
							Free
							<Badge variant="secondary" className="text-[10px]">Active</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground mb-4">
							Basic features for getting started.
						</p>
						<Button size="sm" className="w-full">Upgrade Plan</Button>
					</CardContent>
				</Card>

				{/* Next Invoice */}
				<Card>
					<CardHeader className="pb-3">
						<CardDescription>Next Invoice</CardDescription>
						<CardTitle>$0.00</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground mb-4">
							No upcoming charges on the free plan.
						</p>
						<Button size="sm" variant="outline" className="w-full" asChild>
							<Link href="/billing/invoices">View Invoices</Link>
						</Button>
					</CardContent>
				</Card>

				{/* Payment Method */}
				<Card>
					<CardHeader className="pb-3">
						<CardDescription>Payment Method</CardDescription>
						<CardTitle className="text-muted-foreground text-base">None added</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground mb-4">
							Add a payment method to upgrade your plan.
						</p>
						<Button size="sm" variant="outline" className="w-full" asChild>
							<Link href="/billing/payment-methods">Manage</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Usage Summary */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Usage This Period</CardTitle>
					<CardDescription>Track your resource consumption.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						<UsageItem label="Products" used={0} limit={50} />
						<UsageItem label="Orders" used={0} limit={100} />
						<UsageItem label="Team Members" used={1} limit={3} />
						<UsageItem label="Storage" used={0} limit={500} unit="MB" />
					</div>
					<div className="mt-4 pt-4 border-t">
						<Button size="sm" variant="outline" asChild>
							<Link href="/billing/usage">View Detailed Usage</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function UsageItem({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
	const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground">
					{used}{unit ? ` ${unit}` : ""} / {limit}{unit ? ` ${unit}` : ""}
				</span>
			</div>
			<Progress value={pct} className="h-2" />
		</div>
	)
}
