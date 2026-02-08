"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { createAlertRule, toggleAlertRule } from "../actions"

type AlertRule = {
	id: string
	name: string
	type: string
	channel: string
	threshold: number | null
	isActive: boolean | null
	recipients: string[] | null
}

interface AlertDefinition {
	key: string
	label: string
	description: string
}

interface AlertCategory {
	name: string
	alerts: AlertDefinition[]
}

const alertCategories: AlertCategory[] = [
	{
		name: "Orders",
		alerts: [
			{ key: "order.placed", label: "New order placed", description: "When a customer completes checkout" },
			{ key: "order.cancelled", label: "Order cancelled", description: "When a customer cancels their order" },
			{ key: "order.failed", label: "Order failed", description: "When an order fails due to payment decline" },
			{ key: "order.refund_requested", label: "Refund requested", description: "When a customer requests a refund" },
			{ key: "order.refund_issued", label: "Refund issued", description: "When a refund is processed" },
			{ key: "order.high_value", label: "High-value order", description: "When an order exceeds the value threshold" },
			{ key: "order.note_added", label: "Order note added", description: "When a customer adds a note to their order" },
		],
	},
	{
		name: "Payments",
		alerts: [
			{ key: "payment.failed", label: "Payment failed", description: "When a payment attempt is declined" },
			{ key: "payment.dispute", label: "Payment disputed", description: "When a chargeback or dispute is opened" },
			{ key: "payment.dispute_resolved", label: "Dispute resolved", description: "When a chargeback is won or lost" },
			{ key: "payment.payout", label: "Payout completed", description: "When a payout is sent to your bank" },
			{ key: "payment.crypto_received", label: "Crypto payment received", description: "When a crypto payment is confirmed" },
			{ key: "payment.crypto_expired", label: "Crypto payment expired", description: "When a crypto invoice expires unfulfilled" },
		],
	},
	{
		name: "Inventory",
		alerts: [
			{ key: "inventory.low_stock", label: "Low stock warning", description: "When a variant falls below its stock threshold" },
			{ key: "inventory.out_of_stock", label: "Out of stock", description: "When a variant reaches zero quantity" },
			{ key: "inventory.restocked", label: "Restock received", description: "When inventory is replenished" },
			{ key: "inventory.adjustment", label: "Inventory adjusted", description: "When stock is manually adjusted" },
		],
	},
	{
		name: "Subscriptions",
		alerts: [
			{ key: "subscription.created", label: "New subscription", description: "When a customer starts a subscription" },
			{ key: "subscription.cancelled", label: "Subscription cancelled", description: "When a customer cancels their subscription" },
			{ key: "subscription.paused", label: "Subscription paused", description: "When a customer pauses their subscription" },
			{ key: "subscription.resumed", label: "Subscription resumed", description: "When a paused subscription is resumed" },
			{ key: "subscription.dunning_failed", label: "Payment retry failed", description: "When a subscription renewal payment fails" },
			{ key: "subscription.renewal", label: "Upcoming renewal", description: "Before a subscription renews" },
		],
	},
	{
		name: "Customers",
		alerts: [
			{ key: "customer.signup", label: "New customer signup", description: "When a new account is created" },
			{ key: "customer.deleted", label: "Account deleted", description: "When a customer deletes their account" },
			{ key: "customer.first_order", label: "First order placed", description: "When a customer places their first order" },
			{ key: "customer.vip", label: "VIP threshold reached", description: "When a customer hits the loyalty milestone" },
		],
	},
	{
		name: "Reviews",
		alerts: [
			{ key: "review.submitted", label: "New review submitted", description: "When a customer leaves a review" },
			{ key: "review.negative", label: "Negative review", description: "When a review is below the star threshold" },
			{ key: "review.reported", label: "Review flagged", description: "When a review is reported by a user" },
		],
	},
	{
		name: "Shipping",
		alerts: [
			{ key: "shipping.ready", label: "Ready to fulfill", description: "When new orders are waiting for shipment" },
			{ key: "shipping.delivered", label: "Shipment delivered", description: "When a package is confirmed delivered" },
			{ key: "shipping.failed", label: "Delivery failed", description: "When a shipment is returned or undeliverable" },
			{ key: "shipping.stuck", label: "Tracking stuck", description: "When tracking has no update for multiple days" },
			{ key: "shipping.label_error", label: "Label error", description: "When a shipping label fails to generate" },
		],
	},
	{
		name: "Marketing",
		alerts: [
			{ key: "marketing.discount_spike", label: "Discount code spike", description: "When a code is used unusually often" },
			{ key: "marketing.discount_expired", label: "Discount expired", description: "When a scheduled discount ends" },
			{ key: "marketing.discount_limit", label: "Discount limit reached", description: "When a code hits its max usage" },
			{ key: "marketing.referral_earned", label: "Referral reward earned", description: "When a referral converts" },
			{ key: "marketing.abandoned_cart", label: "Abandoned cart", description: "When a cart is left inactive" },
		],
	},
	{
		name: "Team",
		alerts: [
			{ key: "team.member_joined", label: "Member joined", description: "When a new team member accepts an invite" },
			{ key: "team.member_removed", label: "Member removed", description: "When a team member is removed" },
			{ key: "team.role_changed", label: "Role changed", description: "When a member's role is updated" },
			{ key: "team.invite_sent", label: "Invite sent", description: "When a new invite is created" },
			{ key: "team.invite_expired", label: "Invite expired", description: "When an invite goes unused" },
		],
	},
	{
		name: "Security",
		alerts: [
			{ key: "security.suspicious_login", label: "Suspicious login", description: "When a login occurs from a new device or location" },
			{ key: "security.failed_attempts", label: "Failed login attempts", description: "When multiple failed logins are detected" },
			{ key: "security.password_changed", label: "Password changed", description: "When an admin password is updated" },
			{ key: "security.2fa_changed", label: "Two-factor changed", description: "When 2FA is enabled or disabled" },
			{ key: "security.api_key", label: "API key created/revoked", description: "When API credentials are modified" },
		],
	},
	{
		name: "System",
		alerts: [
			{ key: "system.integration_down", label: "Integration disconnected", description: "When a third-party service loses connection" },
			{ key: "system.webhook_failed", label: "Webhook delivery failed", description: "When an outgoing webhook cannot be delivered" },
			{ key: "system.rate_limit", label: "Rate limit approaching", description: "When API usage nears the limit" },
			{ key: "system.task_failed", label: "Scheduled task failed", description: "When a background job encounters an error" },
		],
	},
]

export function AlertsClient({ rules: initial }: { rules: AlertRule[] }) {
	const [enabledAlerts, setEnabledAlerts] = useState<Record<string, boolean>>(() => {
		const map: Record<string, boolean> = {}
		for (const rule of initial) {
			map[rule.type] = rule.isActive ?? true
		}
		return map
	})

	const [ruleIds, setRuleIds] = useState<Record<string, string>>(() => {
		const map: Record<string, string> = {}
		for (const rule of initial) {
			map[rule.type] = rule.id
		}
		return map
	})

	async function handleToggle(key: string, label: string) {
		const current = enabledAlerts[key] ?? false
		const newState = !current

		setEnabledAlerts((prev) => ({ ...prev, [key]: newState }))

		try {
			const existingId = ruleIds[key]
			if (existingId) {
				await toggleAlertRule(existingId, newState)
			} else {
				const rule = await createAlertRule({
					name: label,
					type: key,
					channel: "email",
				})
				setRuleIds((prev) => ({ ...prev, [key]: rule.id }))
			}
		} catch {
			setEnabledAlerts((prev) => ({ ...prev, [key]: current }))
			toast.error("Failed to update alert")
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm text-muted-foreground">
					Choose which events trigger notifications.
				</p>
			</div>

			{alertCategories.map((category) => (
				<div key={category.name} className="rounded-lg border">
					<div className="px-4 py-3 border-b bg-muted/30">
						<h3 className="text-sm font-medium">{category.name}</h3>
					</div>
					<div className="divide-y">
						{category.alerts.map((alert) => (
							<div key={alert.key} className="flex items-center justify-between px-4 py-3">
								<div className="space-y-0.5 pr-4">
									<p className="text-sm font-medium">{alert.label}</p>
									<p className="text-xs text-muted-foreground">{alert.description}</p>
								</div>
								<Switch
									checked={enabledAlerts[alert.key] ?? false}
									onCheckedChange={() => handleToggle(alert.key, alert.label)}
								/>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}
