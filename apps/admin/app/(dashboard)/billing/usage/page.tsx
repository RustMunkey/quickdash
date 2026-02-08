"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type UsageMetric = {
	label: string
	description: string
	used: number
	limit: number
	unit?: string
}

const usageMetrics: UsageMetric[] = [
	{ label: "Products", description: "Active product listings", used: 0, limit: 50 },
	{ label: "Orders", description: "Orders this billing period", used: 0, limit: 100 },
	{ label: "Team Members", description: "Workspace collaborators", used: 1, limit: 3 },
	{ label: "Storefronts", description: "Connected storefronts", used: 0, limit: 1 },
	{ label: "Workflows", description: "Active automations", used: 0, limit: 5 },
	{ label: "API Requests", description: "API calls this period", used: 0, limit: 10000, unit: "" },
	{ label: "Storage", description: "File and media storage", used: 0, limit: 500, unit: "MB" },
	{ label: "Email Notifications", description: "Transactional emails sent", used: 0, limit: 1000 },
]

export default function UsagePage() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Monitor your resource usage across the current billing period.
			</p>

			{/* Plan Banner */}
			<Card>
				<CardContent className="flex items-center justify-between py-4">
					<div>
						<p className="font-medium">Free Plan</p>
						<p className="text-sm text-muted-foreground">
							Usage resets at the start of each billing period.
						</p>
					</div>
					<Badge variant="secondary">Current Period</Badge>
				</CardContent>
			</Card>

			{/* Usage Grid */}
			<div className="grid gap-4 md:grid-cols-2">
				{usageMetrics.map((metric) => {
					const pct = metric.limit > 0 ? Math.min((metric.used / metric.limit) * 100, 100) : 0
					const isHigh = pct >= 80
					const isFull = pct >= 100

					return (
						<Card key={metric.label}>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
									{isFull ? (
										<Badge variant="destructive" className="text-[10px]">Limit Reached</Badge>
									) : isHigh ? (
										<Badge variant="secondary" className="text-[10px]">Almost Full</Badge>
									) : null}
								</div>
								<CardDescription className="text-xs">{metric.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											{metric.used.toLocaleString()}{metric.unit !== undefined ? ` ${metric.unit}` : ""}
										</span>
										<span className="text-muted-foreground">
											{metric.limit.toLocaleString()}{metric.unit !== undefined ? ` ${metric.unit}` : ""}
										</span>
									</div>
									<Progress value={pct} className="h-2" />
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
