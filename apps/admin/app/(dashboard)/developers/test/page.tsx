"use client"

import { useState, useTransition } from "react"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
	createTestNotification,
	createAllTestNotifications,
	sendTestShippingEmail,
	createTestInboxEmail,
} from "./actions"

const NOTIFICATION_TYPES = [
	{ type: "order" as const, label: "Order", color: "bg-blue-500" },
	{ type: "inventory" as const, label: "Inventory", color: "bg-amber-500" },
	{ type: "payment" as const, label: "Payment", color: "bg-green-500" },
	{ type: "shipment" as const, label: "Shipment", color: "bg-purple-500" },
	{ type: "system" as const, label: "System", color: "bg-zinc-500" },
]

const SHIPPING_STATUSES = [
	{ status: "shipped" as const, label: "Shipped", description: "Your order has shipped" },
	{ status: "out_for_delivery" as const, label: "Out for Delivery", description: "Package is out for delivery" },
	{ status: "delivered" as const, label: "Delivered", description: "Package has been delivered" },
]

export default function TestPage() {
	useBreadcrumbOverride("developers", "Developers")
	useBreadcrumbOverride("test", "Test Page")

	const [isPending, startTransition] = useTransition()

	const handleCreateNotification = (type: typeof NOTIFICATION_TYPES[number]["type"]) => {
		startTransition(async () => {
			try {
				await createTestNotification(type)
				toast.success(`Created ${type} notification`)
			} catch (error) {
				toast.error("Failed to create notification")
			}
		})
	}

	const handleCreateAllNotifications = () => {
		startTransition(async () => {
			try {
				const result = await createAllTestNotifications()
				toast.success(`Created ${result.count} notifications`)
			} catch (error) {
				toast.error("Failed to create notifications")
			}
		})
	}

	const handleSendShippingEmail = (status: typeof SHIPPING_STATUSES[number]["status"]) => {
		startTransition(async () => {
			try {
				const result = await sendTestShippingEmail(status)
				console.log("[Test Email Result]", result)
				if (result.success) {
					toast.success(`Sent ${status} email to ${result.email}`, {
						description: `Email ID: ${result.id}`,
					})
				} else {
					toast.error(`Failed: ${result.error}`)
				}
			} catch (error) {
				console.error("[Test Email Error]", error)
				toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
			}
		})
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Test various features and behaviors in development.</p>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Notifications Testing */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Notifications</CardTitle>
						<CardDescription>
							Test the notification system. Notifications will appear in the right sidebar.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2">
							{NOTIFICATION_TYPES.map(({ type, label, color }) => (
								<Button
									key={type}
									variant="outline"
									size="sm"
									onClick={() => handleCreateNotification(type)}
									disabled={isPending}
								>
									<span className={`size-2 rounded-full ${color} mr-2`} />
									{label}
								</Button>
							))}
						</div>
						<div className="pt-2 border-t">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleCreateAllNotifications}
								disabled={isPending}
							>
								Create All Types
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Shipping Email Testing */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Shipping Emails</CardTitle>
						<CardDescription>
							Test shipping notification emails. Emails will be sent to your account email.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex flex-wrap gap-2">
							{SHIPPING_STATUSES.map(({ status, label }) => (
								<Button
									key={status}
									variant="outline"
									size="sm"
									onClick={() => handleSendShippingEmail(status)}
									disabled={isPending}
								>
									{label}
								</Button>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Note: Requires RESEND_API_KEY to be configured.
						</p>
					</CardContent>
				</Card>

				{/* Inbox / Contact Form Testing */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Support Inbox</CardTitle>
						<CardDescription>
							Test contact form submissions. Emails will appear in Messages → Inbox.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								startTransition(async () => {
									try {
										const result = await createTestInboxEmail()
										if (result.success) {
											toast.success(`Created inbox email from ${result.from}`)
										} else {
											toast.error(`Failed: ${result.error}`)
										}
									} catch (error) {
										toast.error("Failed to create inbox email")
									}
								})
							}}
							disabled={isPending}
						>
							Create Test Contact Email
						</Button>
						<p className="text-xs text-muted-foreground">
							Creates a random customer inquiry in the inbox.
						</p>
					</CardContent>
				</Card>

				{/* More test sections can be added here */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Orders</CardTitle>
						<CardDescription>
							Create test orders to test the full flow.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">Coming soon - create test orders with tracking.</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Webhooks</CardTitle>
						<CardDescription>
							Test incoming webhook payloads.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">Coming soon - simulate webhook events.</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
