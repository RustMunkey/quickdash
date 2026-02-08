"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow, format } from "date-fns"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/data-table"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface WebhookEvent {
	id: string
	provider: string
	eventType: string | null
	externalId: string | null
	status: string
	errorMessage: string | null
	payload: Record<string, unknown> | null
	createdAt: Date
	processedAt: Date | null
}

interface WebhooksClientProps {
	events: WebhookEvent[]
	totalCount: number
	currentPage: number
	providers: string[]
	currentProvider?: string
	currentStatus?: string
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

function getStatusBadge(status: string) {
	const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
		processed: "default",
		failed: "destructive",
		pending: "secondary",
		skipped: "outline",
	}
	return (
		<Badge variant={variants[status] || "outline"} className="capitalize">
			{status}
		</Badge>
	)
}

export function WebhooksClient({
	events,
	totalCount,
	currentPage,
	providers,
	currentProvider,
	currentStatus,
}: WebhooksClientProps) {
	const router = useRouter()

	const handleFilterChange = (key: string, value: string | undefined) => {
		const params = new URLSearchParams()
		if (key === "provider" && value) params.set("provider", value)
		else if (currentProvider && key !== "provider") params.set("provider", currentProvider)

		if (key === "status" && value) params.set("status", value)
		else if (currentStatus && key !== "status") params.set("status", currentStatus)

		params.set("page", "1")
		router.push(`/developers/webhooks?${params.toString()}`)
	}

	const columns: Column<WebhookEvent>[] = [
		{
			key: "status",
			header: "Status",
			cell: (row) => getStatusBadge(row.status),
		},
		{
			key: "provider",
			header: "Provider",
			cell: (row) => <span className="font-medium">{getProviderLabel(row.provider)}</span>,
		},
		{
			key: "eventType",
			header: "Event Type",
			cell: (row) => (
				<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
					{row.eventType || "-"}
				</code>
			),
		},
		{
			key: "externalId",
			header: "External ID",
			cell: (row) =>
				row.externalId ? (
					<code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[120px] block">
						{row.externalId}
					</code>
				) : (
					<span className="text-muted-foreground">-</span>
				),
		},
		{
			key: "createdAt",
			header: "Received",
			cell: (row) => (
				<span className="text-sm" title={format(new Date(row.createdAt), "PPpp")}>
					{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
				</span>
			),
		},
		{
			key: "processedAt",
			header: "Processed",
			cell: (row) =>
				row.processedAt ? (
					<span className="text-sm text-green-600" title={format(new Date(row.processedAt), "PPpp")}>
						{formatDistanceToNow(new Date(row.processedAt), { addSuffix: true })}
					</span>
				) : row.errorMessage ? (
					<span className="text-sm text-red-600 truncate max-w-[150px] block" title={row.errorMessage}>
						{row.errorMessage}
					</span>
				) : (
					<span className="text-muted-foreground">-</span>
				),
		},
	]

	return (
		<DataTable
			data={events}
			columns={columns}
			searchKey="eventType"
			searchPlaceholder="Search events..."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			onRowClick={(row) => router.push(`/developers/webhooks/${row.id}`)}
			emptyMessage="No webhook events"
			emptyDescription={
				currentProvider || currentStatus
					? "No events match your filters"
					: "Webhook events will appear here when received"
			}
			filters={
				<>
					<Select
						value={currentProvider || "all"}
						onValueChange={(v) => handleFilterChange("provider", v === "all" ? undefined : v)}
					>
						<SelectTrigger className="w-[180px] h-9">
							<SelectValue placeholder="All Providers" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Providers</SelectItem>
							{providers.map((provider) => (
								<SelectItem key={provider} value={provider}>
									{getProviderLabel(provider)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={currentStatus || "all"}
						onValueChange={(v) => handleFilterChange("status", v === "all" ? undefined : v)}
					>
						<SelectTrigger className="w-[150px] h-9">
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="processed">Processed</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="failed">Failed</SelectItem>
							<SelectItem value="skipped">Skipped</SelectItem>
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						className="h-9"
						onClick={() => router.refresh()}
					>
						<HugeiconsIcon icon={RefreshIcon} size={14} />
						Refresh
					</Button>
				</>
			}
		/>
	)
}
