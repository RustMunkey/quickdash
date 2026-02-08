"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	WebhookIcon,
	ArrowRight01Icon,
	ArrowLeft01Icon,
	Copy01Icon,
	Delete02Icon,
	RefreshIcon,
	Tick02Icon,
	Cancel01Icon,
	ViewIcon,
	ViewOffIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import {
	createIncomingWebhook,
	updateIncomingWebhook,
	deleteIncomingWebhook,
	regenerateIncomingWebhookToken,
	createOutgoingWebhook,
	updateOutgoingWebhook,
	deleteOutgoingWebhook,
	retryDelivery,
} from "./actions"
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events"

interface IncomingWebhook {
	id: string
	name: string
	token: string
	channel: string
	defaultUsername: string | null
	defaultAvatarUrl: string | null
	isActive: boolean
	lastUsedAt: Date | null
	messageCount: number
	createdAt: Date
}

interface OutgoingWebhook {
	id: string
	name: string
	url: string
	secret: string
	events: string[]
	isActive: boolean
	lastDeliveryAt: Date | null
	lastDeliveryStatus: string | null
	createdAt: Date
}

interface DeliveryLog {
	id: string
	endpointId: string
	endpointName: string | null
	event: string
	status: string
	responseCode: number | null
	attempts: number
	errorMessage: string | null
	createdAt: Date
	deliveredAt: Date | null
}

interface WebhooksClientProps {
	incomingWebhooks: IncomingWebhook[]
	outgoingWebhooks: OutgoingWebhook[]
	deliveryLogs: { items: DeliveryLog[]; totalCount: number }
}

export function WebhooksClient({
	incomingWebhooks,
	outgoingWebhooks,
	deliveryLogs,
}: WebhooksClientProps) {
	const router = useRouter()
	const [showIncomingDialog, setShowIncomingDialog] = useState(false)
	const [showOutgoingDialog, setShowOutgoingDialog] = useState(false)
	const [loading, setLoading] = useState(false)

	// Incoming webhook form
	const [incomingName, setIncomingName] = useState("")
	const [incomingChannel, setIncomingChannel] = useState("integrations")

	// Outgoing webhook form
	const [outgoingName, setOutgoingName] = useState("")
	const [outgoingUrl, setOutgoingUrl] = useState("")
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])

	const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

	const handleCreateIncoming = async () => {
		if (!incomingName.trim()) {
			toast.error("Name is required")
			return
		}
		setLoading(true)
		try {
			const webhook = await createIncomingWebhook({
				name: incomingName,
				channel: incomingChannel,
			})
			toast.success("Incoming webhook created")
			setShowIncomingDialog(false)
			setIncomingName("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleCreateOutgoing = async () => {
		if (!outgoingName.trim() || !outgoingUrl.trim()) {
			toast.error("Name and URL are required")
			return
		}
		if (selectedEvents.length === 0) {
			toast.error("Select at least one event")
			return
		}
		setLoading(true)
		try {
			await createOutgoingWebhook({
				name: outgoingName,
				url: outgoingUrl,
				events: selectedEvents,
			})
			toast.success("Outgoing webhook created")
			setShowOutgoingDialog(false)
			setOutgoingName("")
			setOutgoingUrl("")
			setSelectedEvents([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	const handleToggleIncoming = async (id: string, isActive: boolean) => {
		try {
			await updateIncomingWebhook(id, { isActive })
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleToggleOutgoing = async (id: string, isActive: boolean) => {
		try {
			await updateOutgoingWebhook(id, { isActive })
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleDeleteIncoming = async (id: string) => {
		if (!confirm("Delete this webhook?")) return
		try {
			await deleteIncomingWebhook(id)
			toast.success("Webhook deleted")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleDeleteOutgoing = async (id: string) => {
		if (!confirm("Delete this webhook?")) return
		try {
			await deleteOutgoingWebhook(id)
			toast.success("Webhook deleted")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const handleRetry = async (id: string) => {
		try {
			await retryDelivery(id)
			toast.success("Delivery queued for retry")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message)
		}
	}

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
		toast.success("Copied to clipboard")
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
						<Link href="/settings/integrations" className="hover:text-foreground">
							Integrations
						</Link>
						<span>/</span>
						<span>Webhooks</span>
					</div>
					<p className="text-muted-foreground text-sm">
						Configure incoming and outgoing webhooks to connect with external services.
					</p>
				</div>
			</div>

			<Tabs defaultValue="outgoing" className="space-y-4">
				<TabsList>
					<TabsTrigger value="outgoing" className="gap-2">
						<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
						Outgoing
					</TabsTrigger>
					<TabsTrigger value="incoming" className="gap-2">
						<HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
						Incoming
					</TabsTrigger>
					<TabsTrigger value="logs" className="gap-2">
						Delivery Logs
					</TabsTrigger>
				</TabsList>

				{/* OUTGOING WEBHOOKS TAB */}
				<TabsContent value="outgoing" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-base">Outgoing Webhooks</CardTitle>
									<CardDescription>
										Send event notifications to external services when things happen in your store.
									</CardDescription>
								</div>
								<Button size="sm" onClick={() => setShowOutgoingDialog(true)}>Add Webhook</Button>
							</div>
						</CardHeader>
						<CardContent>
							{outgoingWebhooks.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
										<HugeiconsIcon icon={WebhookIcon} size={32} className="text-muted-foreground" />
									</div>
									<h3 className="font-medium mb-2">No outgoing webhooks configured</h3>
									<p className="text-sm text-muted-foreground max-w-md">
										Outgoing webhooks will notify external URLs when events occur.
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{outgoingWebhooks.map((webhook) => (
										<div
											key={webhook.id}
											className="flex items-center justify-between p-3 rounded-lg border"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="font-medium text-sm">{webhook.name}</p>
													<Badge variant={webhook.isActive ? "default" : "secondary"}>
														{webhook.isActive ? "Active" : "Paused"}
													</Badge>
													{webhook.lastDeliveryStatus && (
														<Badge
															variant={webhook.lastDeliveryStatus === "success" ? "outline" : "destructive"}
														>
															{webhook.lastDeliveryStatus}
														</Badge>
													)}
												</div>
												<code className="text-xs text-muted-foreground truncate block">
													{webhook.url}
												</code>
												<p className="text-xs text-muted-foreground mt-1">
													Events: {(webhook.events as string[]).join(", ")}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Switch
													checked={webhook.isActive}
													onCheckedChange={(checked) => handleToggleOutgoing(webhook.id, checked)}
												/>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleDeleteOutgoing(webhook.id)}
												>
													<HugeiconsIcon icon={Delete02Icon} size={14} />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* INCOMING WEBHOOKS TAB */}
				<TabsContent value="incoming" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-base">Incoming Webhooks</CardTitle>
									<CardDescription>
										Generate webhook URLs for external services to send messages to your channels.
									</CardDescription>
								</div>
								<Button size="sm" onClick={() => setShowIncomingDialog(true)}>Create Webhook</Button>
							</div>
						</CardHeader>
						<CardContent>
							{incomingWebhooks.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
										<HugeiconsIcon icon={ArrowLeft01Icon} size={32} className="text-muted-foreground" />
									</div>
									<h3 className="font-medium mb-2">No incoming webhooks configured</h3>
									<p className="text-sm text-muted-foreground max-w-md">
										Create webhook URLs to receive messages from external services like GitHub, CI/CD, or custom integrations.
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{incomingWebhooks.map((webhook) => (
										<div
											key={webhook.id}
											className="p-3 rounded-lg border space-y-2"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<p className="font-medium text-sm">{webhook.name}</p>
													<Badge variant={webhook.isActive ? "default" : "secondary"}>
														{webhook.isActive ? "Active" : "Paused"}
													</Badge>
													<Badge variant="outline">#{webhook.channel}</Badge>
												</div>
												<div className="flex items-center gap-2">
													<Switch
														checked={webhook.isActive}
														onCheckedChange={(checked) => handleToggleIncoming(webhook.id, checked)}
													/>
													<Button
														size="icon"
														variant="ghost"
														onClick={() => handleDeleteIncoming(webhook.id)}
													>
														<HugeiconsIcon icon={Delete02Icon} size={14} />
													</Button>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
													{baseUrl}/api/webhooks/incoming/{webhook.token}
												</code>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => copyToClipboard(`${baseUrl}/api/webhooks/incoming/${webhook.token}`)}
												>
													<HugeiconsIcon icon={Copy01Icon} size={14} />
												</Button>
											</div>
											<p className="text-xs text-muted-foreground">
												{webhook.messageCount} messages received
												{webhook.lastUsedAt && ` • Last used ${new Date(webhook.lastUsedAt).toLocaleDateString("en-US")}`}
											</p>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">System Webhooks</CardTitle>
							<CardDescription>
								Pre-configured webhook endpoints for integrated services.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{[
									{ name: "Polar", endpoint: "/api/webhooks/polar", status: "active" },
									{ name: "Resend", endpoint: "/api/webhooks/resend", status: "active" },
									{ name: "Shipping", endpoint: "/api/webhooks/shipping/[carrier]", status: "active" },
									{ name: "Inngest", endpoint: "/api/inngest", status: "active" },
								].map((webhook) => (
									<div
										key={webhook.name}
										className="flex items-center justify-between px-3 py-2 rounded-lg border"
									>
										<div>
											<p className="text-sm font-medium">{webhook.name}</p>
											<code className="text-xs text-muted-foreground">{webhook.endpoint}</code>
										</div>
										<Badge variant={webhook.status === "active" ? "default" : "secondary"}>
											{webhook.status}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* DELIVERY LOGS TAB */}
				<TabsContent value="logs" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Delivery Logs</CardTitle>
							<CardDescription>
								Recent outgoing webhook delivery attempts.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{deliveryLogs.items.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<p className="text-sm text-muted-foreground">No delivery logs yet</p>
								</div>
							) : (
								<div className="space-y-2">
									{deliveryLogs.items.map((log) => (
										<div
											key={log.id}
											className="flex items-center justify-between p-3 rounded-lg border"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<code className="text-xs font-mono">{log.event}</code>
													<Badge
														variant={
															log.status === "success"
																? "default"
																: log.status === "pending"
																? "outline"
																: "destructive"
														}
													>
														{log.status}
													</Badge>
													{log.responseCode && (
														<span className="text-xs text-muted-foreground">
															HTTP {log.responseCode}
														</span>
													)}
												</div>
												<p className="text-xs text-muted-foreground">
													{log.endpointName || "Unknown endpoint"} • {log.attempts} attempt(s)
													{log.errorMessage && ` • ${log.errorMessage}`}
												</p>
												<p className="text-xs text-muted-foreground">
													{new Date(log.createdAt).toLocaleString()}
												</p>
											</div>
											{log.status === "failed" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleRetry(log.id)}
												>
													<HugeiconsIcon icon={RefreshIcon} size={14} className="mr-1" />
													Retry
												</Button>
											)}
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* CREATE INCOMING WEBHOOK DIALOG */}
			<Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Incoming Webhook</DialogTitle>
						<DialogDescription>
							Generate a URL that external services can POST messages to.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Name</Label>
							<Input
								placeholder="e.g., GitHub Notifications"
								value={incomingName}
								onChange={(e) => setIncomingName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Channel</Label>
							<Select value={incomingChannel} onValueChange={setIncomingChannel}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="general">general</SelectItem>
									<SelectItem value="integrations">integrations</SelectItem>
									<SelectItem value="alerts">alerts</SelectItem>
									<SelectItem value="deployments">deployments</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowIncomingDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateIncoming} disabled={loading}>
							{loading ? "Creating..." : "Create Webhook"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* CREATE OUTGOING WEBHOOK DIALOG */}
			<Dialog open={showOutgoingDialog} onOpenChange={setShowOutgoingDialog}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Outgoing Webhook</DialogTitle>
						<DialogDescription>
							Send event notifications to an external URL.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Name</Label>
							<Input
								placeholder="e.g., Warehouse System"
								value={outgoingName}
								onChange={(e) => setOutgoingName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Endpoint URL</Label>
							<Input
								placeholder="https://example.com/webhook"
								value={outgoingUrl}
								onChange={(e) => setOutgoingUrl(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Events</Label>
							<div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
								{Object.entries(WEBHOOK_EVENTS).map(([event, description]) => (
									<label
										key={event}
										className="flex items-center gap-2 text-sm cursor-pointer"
									>
										<Checkbox
											checked={selectedEvents.includes(event)}
											onCheckedChange={(checked) => {
												if (checked) {
													setSelectedEvents([...selectedEvents, event])
												} else {
													setSelectedEvents(selectedEvents.filter((e) => e !== event))
												}
											}}
										/>
										<span className="truncate" title={description}>
											{event}
										</span>
									</label>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowOutgoingDialog(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateOutgoing} disabled={loading}>
							{loading ? "Creating..." : "Create Webhook"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
