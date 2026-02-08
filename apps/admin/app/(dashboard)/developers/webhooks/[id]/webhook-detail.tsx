"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Tick01Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface WebhookEvent {
	id: string
	provider: string
	eventType: string | null
	externalId: string | null
	status: string
	errorMessage: string | null
	payload: Record<string, unknown> | null
	createdAt: string
	processedAt: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
	"shipping-17track": "17track",
	"shipping-tracktry": "Tracktry",
	"shipping-generic": "Shipping (Generic)",
	"email-ingest": "Email Ingestion",
	polar: "Polar",
	resend: "Resend",
}

function getProviderLabel(provider: string) {
	return PROVIDER_LABELS[provider] || provider
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
	const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
		processed: "default",
		failed: "destructive",
		pending: "secondary",
		skipped: "outline",
	}
	return variants[status] || "outline"
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)

	const copy = async () => {
		await navigator.clipboard.writeText(text)
		setCopied(true)
		toast.success("Copied to clipboard")
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={copy}>
			<HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={12} />
			{copied ? "Copied" : "Copy"}
		</Button>
	)
}

export function WebhookDetail({ event }: { event: WebhookEvent }) {
	const router = useRouter()
	const payloadString = event.payload ? JSON.stringify(event.payload, null, 2) : "No payload"

	return (
		<div className="space-y-4">
			{/* Header row */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => router.push("/developers/webhooks")}
					>
						<HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
					</Button>
					<div className="flex items-center gap-2">
						<span className="font-medium">{getProviderLabel(event.provider)}</span>
						<Badge variant={getStatusVariant(event.status)} className="capitalize">
							{event.status}
						</Badge>
					</div>
				</div>
			</div>

			{/* Metadata row */}
			<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
				<div>
					<span className="text-muted-foreground">Event Type: </span>
					<code className="bg-muted px-1.5 py-0.5 rounded text-xs">{event.eventType || "-"}</code>
				</div>
				{event.externalId && (
					<div>
						<span className="text-muted-foreground">External ID: </span>
						<code className="bg-muted px-1.5 py-0.5 rounded text-xs">{event.externalId}</code>
					</div>
				)}
				<div>
					<span className="text-muted-foreground">Received: </span>
					<span>{format(new Date(event.createdAt), "PPpp")}</span>
				</div>
				{event.processedAt && (
					<div>
						<span className="text-muted-foreground">Processed: </span>
						<span className="text-green-600">{format(new Date(event.processedAt), "PPpp")}</span>
					</div>
				)}
				{event.errorMessage && (
					<div>
						<span className="text-muted-foreground">Error: </span>
						<span className="text-red-600">{event.errorMessage}</span>
					</div>
				)}
			</div>

			{/* Payload code viewer */}
			<div className="rounded-lg border overflow-hidden">
				<div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
					<span className="text-xs font-medium text-muted-foreground">JSON Payload</span>
					<div className="flex items-center gap-2">
						<span className="text-[10px] text-muted-foreground">
							{payloadString.length.toLocaleString()} characters
						</span>
						<CopyButton text={payloadString} />
					</div>
				</div>
				<pre className="w-full min-h-[500px] p-4 font-mono text-sm leading-relaxed bg-zinc-950 text-zinc-100 overflow-auto">
					{payloadString}
				</pre>
			</div>
		</div>
	)
}
