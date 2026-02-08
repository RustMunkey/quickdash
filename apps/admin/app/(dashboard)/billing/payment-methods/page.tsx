"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { CreditCardIcon } from "@hugeicons/core-free-icons"

export default function PaymentMethodsPage() {
	// Placeholder — will be managed through Polar
	const [methods] = useState<any[]>([])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage payment methods for your subscription.
			</p>

			{methods.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
							<HugeiconsIcon icon={CreditCardIcon} size={24} className="text-muted-foreground" />
						</div>
						<h3 className="font-medium mb-1">No payment methods</h3>
						<p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
							Add a payment method to upgrade your plan or enable automatic billing.
						</p>
						<Button size="sm">Add Payment Method</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{methods.map((method: any) => (
						<Card key={method.id}>
							<CardHeader className="pb-3">
								<CardTitle className="text-base flex items-center gap-2">
									<HugeiconsIcon icon={CreditCardIcon} size={16} />
									•••• {method.last4}
								</CardTitle>
								<CardDescription>
									Expires {method.expMonth}/{method.expYear}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex gap-2">
								<Button size="sm" variant="outline">Set Default</Button>
								<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
									Remove
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
