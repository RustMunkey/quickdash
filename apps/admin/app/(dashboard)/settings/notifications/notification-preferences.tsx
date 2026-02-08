"use client"

import { useState, useTransition, useEffect } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	ShoppingBag01Icon,
	Package01Icon,
	CreditCardIcon,
	DeliveryTruck01Icon,
	UserGroupIcon,
	SpeakerIcon,
	Notification01Icon,
	Mail01Icon,
	ComputerIcon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { updateNotificationPreferences } from "./actions"

type Preferences = {
	newOrders: boolean
	lowStock: boolean
	payments: boolean
	shipments: boolean
	collaboration: boolean
	sound: boolean
	desktop: boolean
	email: boolean
}

const eventTypes = [
	{
		key: "newOrders",
		label: "New Orders",
		description: "When a new order is placed",
		icon: ShoppingBag01Icon,
	},
	{
		key: "lowStock",
		label: "Low Stock Alerts",
		description: "When inventory falls below threshold",
		icon: Package01Icon,
	},
	{
		key: "payments",
		label: "Payment Updates",
		description: "Payment confirmations and issues",
		icon: CreditCardIcon,
	},
	{
		key: "shipments",
		label: "Shipping Updates",
		description: "Tracking and delivery notifications",
		icon: DeliveryTruck01Icon,
	},
	{
		key: "collaboration",
		label: "Team Activity",
		description: "When team members mention you or assign tasks",
		icon: UserGroupIcon,
	},
] as const

const deliveryMethods = [
	{
		key: "sound",
		label: "Sound",
		description: "Play a sound for new notifications",
		icon: SpeakerIcon,
	},
	{
		key: "desktop",
		label: "Desktop Notifications",
		description: "Show browser push notifications",
		icon: ComputerIcon,
	},
	{
		key: "email",
		label: "Email Digest",
		description: "Receive daily email summary of notifications",
		icon: Mail01Icon,
	},
] as const

export function NotificationPreferencesSettings({
	preferences: initialPreferences,
}: {
	preferences: Preferences
}) {
	const [preferences, setPreferences] = useState<Preferences>(initialPreferences)
	const [isPending, startTransition] = useTransition()
	const [hasChanges, setHasChanges] = useState(false)
	const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("default")

	// Check browser notification permission on mount
	useEffect(() => {
		if (typeof window !== "undefined" && "Notification" in window) {
			setDesktopPermission(Notification.permission)
		} else {
			setDesktopPermission("unsupported")
		}
	}, [])

	const handleToggle = (key: keyof Preferences, value: boolean) => {
		// If enabling desktop notifications, request permission first
		if (key === "desktop" && value && desktopPermission !== "granted") {
			requestDesktopPermission()
			return
		}

		setPreferences((prev) => ({ ...prev, [key]: value }))
		setHasChanges(true)
	}

	const requestDesktopPermission = async () => {
		if (typeof window === "undefined" || !("Notification" in window)) {
			toast.error("Desktop notifications are not supported in this browser")
			return
		}

		try {
			const permission = await Notification.requestPermission()
			setDesktopPermission(permission)

			if (permission === "granted") {
				setPreferences((prev) => ({ ...prev, desktop: true }))
				setHasChanges(true)
				// Show a test notification
				new Notification("Notifications Enabled", {
					body: "You'll now receive desktop notifications from Quickdash",
					icon: "/favicon.ico",
				})
			} else if (permission === "denied") {
				toast.error("Desktop notifications were denied. You can enable them in your browser settings.")
			}
		} catch {
			toast.error("Failed to request notification permission")
		}
	}

	const handleSave = () => {
		startTransition(async () => {
			try {
				await updateNotificationPreferences(preferences)
				setHasChanges(false)
				toast.success("Notification preferences saved")
			} catch {
				toast.error("Failed to save preferences")
			}
		})
	}

	const handleReset = () => {
		setPreferences(initialPreferences)
		setHasChanges(false)
	}

	return (
		<div className="space-y-6">
			<p className="text-muted-foreground text-sm">
				Choose what notifications you want to receive and how.
			</p>

			{/* Event Types */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={Notification01Icon} size={18} />
						Event Types
					</CardTitle>
					<CardDescription>
						Select which events should trigger notifications.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{eventTypes.map((event, index) => (
						<div key={event.key}>
							{index > 0 && <Separator className="my-4" />}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
										<HugeiconsIcon icon={event.icon} size={18} className="text-muted-foreground" />
									</div>
									<div>
										<Label htmlFor={event.key} className="text-sm font-medium cursor-pointer">
											{event.label}
										</Label>
										<p className="text-xs text-muted-foreground">{event.description}</p>
									</div>
								</div>
								<Switch
									id={event.key}
									checked={preferences[event.key]}
									onCheckedChange={(checked) => handleToggle(event.key, checked)}
								/>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Delivery Methods */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={ComputerIcon} size={18} />
						Delivery Methods
					</CardTitle>
					<CardDescription>
						Choose how you want to receive notifications.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{deliveryMethods.map((method, index) => (
						<div key={method.key}>
							{index > 0 && <Separator className="my-4" />}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
										<HugeiconsIcon icon={method.icon} size={18} className="text-muted-foreground" />
									</div>
									<div>
										<Label htmlFor={method.key} className="text-sm font-medium cursor-pointer">
											{method.label}
										</Label>
										<p className="text-xs text-muted-foreground">
											{method.description}
											{method.key === "desktop" && desktopPermission === "denied" && (
												<span className="text-destructive ml-1">
													(Blocked in browser settings)
												</span>
											)}
											{method.key === "desktop" && desktopPermission === "unsupported" && (
												<span className="text-muted-foreground ml-1">
													(Not supported in this browser)
												</span>
											)}
										</p>
									</div>
								</div>
								<Switch
									id={method.key}
									checked={preferences[method.key]}
									onCheckedChange={(checked) => handleToggle(method.key, checked)}
									disabled={
										method.key === "desktop" &&
										(desktopPermission === "denied" || desktopPermission === "unsupported")
									}
								/>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Save Actions */}
			{hasChanges && (
				<div className="flex items-center justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur-sm py-3 px-4 -mx-4 border-t">
					<p className="text-sm text-muted-foreground mr-auto">You have unsaved changes</p>
					<Button variant="outline" onClick={handleReset} disabled={isPending}>
						Reset
					</Button>
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			)}
		</div>
	)
}
