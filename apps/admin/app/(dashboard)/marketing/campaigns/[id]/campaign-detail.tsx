"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateCampaignStatus, deleteCampaign } from "../../actions"

interface CampaignDetailProps {
	campaign: {
		id: string
		name: string
		description: string | null
		type: string
		status: string
		discountCode: string | null
		subject: string | null
		content: string | null
		audience: string | null
		scheduledAt: Date | null
		startedAt: Date | null
		endedAt: Date | null
		recipientCount: number | null
		sentCount: number | null
		openCount: number | null
		clickCount: number | null
		conversionCount: number | null
		revenue: string | null
		createdAt: Date
		updatedAt: Date
	}
}

const statusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const statuses = ["draft", "scheduled", "active", "ended", "cancelled"]

export function CampaignDetail({ campaign }: CampaignDetailProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(campaign.id, campaign.name)

	const handleStatusChange = async (status: string) => {
		setLoading(true)
		try {
			await updateCampaignStatus(campaign.id, status)
			toast.success(`Status updated to ${status}`)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		setLoading(true)
		try {
			await deleteCampaign(campaign.id)
			toast.success("Campaign deleted")
			router.push("/marketing/campaigns")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const openRate = campaign.sentCount && campaign.openCount
		? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1)
		: null
	const clickRate = campaign.sentCount && campaign.clickCount
		? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1)
		: null
	const convRate = campaign.sentCount && campaign.conversionCount
		? ((campaign.conversionCount / campaign.sentCount) * 100).toFixed(1)
		: null

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">{campaign.name}</h2>
					<Badge variant="secondary" className={`text-[11px] px-1.5 py-0 border-0 ${statusColors[campaign.status] ?? ""}`}>
						{campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Select value={campaign.status} onValueChange={handleStatusChange} disabled={loading}>
						<SelectTrigger className="h-9 w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statuses.map((s) => (
								<SelectItem key={s} value={s}>
									{s.charAt(0).toUpperCase() + s.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete "{campaign.name}"?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this campaign and its data.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					{campaign.sentCount != null && campaign.sentCount > 0 && (
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<div className="rounded-lg border p-3">
								<p className="text-xs text-muted-foreground">Sent</p>
								<p className="text-lg font-semibold">{campaign.sentCount?.toLocaleString()}</p>
							</div>
							<div className="rounded-lg border p-3">
								<p className="text-xs text-muted-foreground">Open Rate</p>
								<p className="text-lg font-semibold">{openRate ?? "0"}%</p>
							</div>
							<div className="rounded-lg border p-3">
								<p className="text-xs text-muted-foreground">Click Rate</p>
								<p className="text-lg font-semibold">{clickRate ?? "0"}%</p>
							</div>
							<div className="rounded-lg border p-3">
								<p className="text-xs text-muted-foreground">Revenue</p>
								<p className="text-lg font-semibold">{campaign.revenue ? formatCurrency(campaign.revenue) : "$0"}</p>
							</div>
						</div>
					)}

					{campaign.description && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Description</h3>
							<p className="text-sm text-muted-foreground">{campaign.description}</p>
						</div>
					)}

					{campaign.subject && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Email Subject</h3>
							<p className="text-sm">{campaign.subject}</p>
						</div>
					)}

					{campaign.content && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Content</h3>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.content}</p>
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Type</span>
								<span className="capitalize">{campaign.type}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Audience</span>
								<span className="capitalize">{campaign.audience ?? "All"}</span>
							</div>
							{campaign.discountCode && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Discount</span>
									<span className="font-mono text-xs">{campaign.discountCode}</span>
								</div>
							)}
							{campaign.scheduledAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Scheduled</span>
									<span>{formatDate(campaign.scheduledAt)}</span>
								</div>
							)}
							{campaign.startedAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Started</span>
									<span>{formatDate(campaign.startedAt)}</span>
								</div>
							)}
							{campaign.endedAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Ended</span>
									<span>{formatDate(campaign.endedAt)}</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span>{formatDate(campaign.createdAt)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
