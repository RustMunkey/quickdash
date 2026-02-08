"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/data-table"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { formatDate } from "@/lib/format"
import { createCampaign, bulkDeleteCampaigns } from "../actions"

interface Campaign {
	id: string
	name: string
	description: string | null
	type: string
	status: string
	discountCode: string | null
	audience: string | null
	recipientCount: number | null
	sentCount: number | null
	openCount: number | null
	clickCount: number | null
	scheduledAt: Date | null
	startedAt: Date | null
	endedAt: Date | null
	createdAt: Date
}

const statusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const typeLabels: Record<string, string> = {
	email: "Email",
	banner: "Banner",
	social: "Social",
}

interface CampaignsTableProps {
	campaigns: Campaign[]
	totalCount: number
	currentPage: number
}

export function CampaignsTable({ campaigns, totalCount, currentPage }: CampaignsTableProps) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [type, setType] = useState("email")
	const [subject, setSubject] = useState("")
	const [audience, setAudience] = useState("all")
	const [discountCode, setDiscountCode] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteCampaigns(selectedIds)
			toast.success(`Deleted ${selectedIds.length} campaign(s)`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const filtered = statusFilter === "all"
		? campaigns
		: campaigns.filter((c) => c.status === statusFilter)

	const columns: Column<Campaign>[] = [
		{
			key: "name",
			header: "Campaign",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.name}</span>
					{row.description && (
						<p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.description}</p>
					)}
				</div>
			),
		},
		{
			key: "type",
			header: "Type",
			cell: (row) => (
				<Badge variant="secondary" className="text-[10px]">
					{typeLabels[row.type] ?? row.type}
				</Badge>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => (
				<Badge variant="secondary" className={`text-[11px] px-1.5 py-0 border-0 ${statusColors[row.status] ?? ""}`}>
					{row.status.charAt(0).toUpperCase() + row.status.slice(1)}
				</Badge>
			),
		},
		{
			key: "audience",
			header: "Audience",
			cell: (row) => (
				<span className="text-sm capitalize">{row.audience ?? "All"}</span>
			),
		},
		{
			key: "performance",
			header: "Performance",
			cell: (row) => {
				if (!row.sentCount) return <span className="text-xs text-muted-foreground">—</span>
				const openRate = row.sentCount > 0 && row.openCount ? ((row.openCount / row.sentCount) * 100).toFixed(1) : "0"
				const clickRate = row.sentCount > 0 && row.clickCount ? ((row.clickCount / row.sentCount) * 100).toFixed(1) : "0"
				return (
					<div className="text-xs text-muted-foreground">
						<span>{row.sentCount} sent</span>
						<span className="mx-1">&middot;</span>
						<span>{openRate}% open</span>
						<span className="mx-1">&middot;</span>
						<span>{clickRate}% click</span>
					</div>
				)
			},
		},
		{
			key: "date",
			header: "Date",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.startedAt ? formatDate(row.startedAt) : row.scheduledAt ? formatDate(row.scheduledAt) : formatDate(row.createdAt)}
				</span>
			),
		},
	]

	const handleCreate = async () => {
		if (!name.trim()) return
		setLoading(true)
		try {
			await createCampaign({
				name: name.trim(),
				description: description.trim() || undefined,
				type,
				subject: subject.trim() || undefined,
				audience,
				discountCode: discountCode.trim() || undefined,
			})
			toast.success("Campaign created")
			setCreateOpen(false)
			setName("")
			setDescription("")
			setType("email")
			setSubject("")
			setAudience("all")
			setDiscountCode("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to create campaign")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={filtered}
				searchPlaceholder="Search campaigns..."
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				onRowClick={(row) => router.push(`/marketing/campaigns/${row.id}`)}
				emptyMessage="No campaigns"
				emptyDescription="Create a campaign to engage your customers."
				totalCount={totalCount}
				currentPage={currentPage}
				filters={
					<>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[160px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="scheduled">Scheduled</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="ended">Ended</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setCreateOpen(true)}>Create Campaign</Button>
					</>
				}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Campaign</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Sale Announcement" />
						</div>
						<div>
							<Label>Description</Label>
							<Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief campaign description" rows={2} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Type</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="email">Email</SelectItem>
										<SelectItem value="banner">Banner</SelectItem>
										<SelectItem value="social">Social</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Audience</Label>
								<Select value={audience} onValueChange={setAudience}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Customers</SelectItem>
										<SelectItem value="segment">Segment</SelectItem>
										<SelectItem value="vip">VIP Only</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						{type === "email" && (
							<div>
								<Label>Subject Line</Label>
								<Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" />
							</div>
						)}
						<div>
							<Label>Discount Code (optional)</Label>
							<Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. SPRING20" className="font-mono" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={loading || !name.trim()}>Create</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
