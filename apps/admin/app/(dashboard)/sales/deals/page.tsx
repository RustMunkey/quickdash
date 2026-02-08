import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DealsPage() {
	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Track sales opportunities from lead to close.
				</p>
				<Button>New Deal</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Open Deals</CardDescription>
						<CardTitle className="text-2xl">0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Pipeline Value</CardDescription>
						<CardTitle className="text-2xl">$0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Won This Month</CardDescription>
						<CardTitle className="text-2xl">0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Win Rate</CardDescription>
						<CardTitle className="text-2xl">--%</CardTitle>
					</CardHeader>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Deals</CardTitle>
					<CardDescription>
						View and manage your sales pipeline.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-muted-foreground">No deals yet</p>
						<p className="text-sm text-muted-foreground/60 mt-1">
							Create your first deal to start tracking revenue.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
