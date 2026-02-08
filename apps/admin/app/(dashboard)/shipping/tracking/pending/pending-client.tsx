"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
	Check,
	X,
	Pencil,
	Package,
	Mail,
	ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import {
	approveTracking,
	rejectTracking,
	updateTrackingOrder,
	addTrustedSender,
	bulkRejectPendingTracking,
} from "../../actions"

interface PendingTrackingItem {
	id: string
	trackingNumber: string
	status: string
	source: string | null
	sourceDetails: {
		sender?: string
		subject?: string
		confidence?: string
	} | null
	createdAt: Date
	order: {
		id: string
		orderNumber: string
		customerName: string | null
	} | null
	carrier: {
		id: string
		name: string
		code: string
	} | null
}

interface PendingTrackingClientProps {
	items: PendingTrackingItem[]
	totalCount: number
	currentPage: number
}

export function PendingTrackingClient({
	items,
	totalCount,
	currentPage,
}: PendingTrackingClientProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [selectedItem, setSelectedItem] = useState<PendingTrackingItem | null>(null)
	const [selectedOrderId, setSelectedOrderId] = useState<string>("")
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [sourceFilter, setSourceFilter] = useState("all")

	const handleApprove = async (id: string, senderEmail?: string) => {
		startTransition(async () => {
			const result = await approveTracking(id)
			if (result.success) {
				toast.success("Tracking approved and order updated")

				if (senderEmail) {
					const trustSender = window.confirm(
						`Do you want to auto-approve future emails from ${senderEmail}?`
					)
					if (trustSender) {
						await addTrustedSender(senderEmail)
						toast.success(`${senderEmail} added to trusted senders`)
					}
				}

				router.refresh()
			} else {
				toast.error(result.error || "Failed to approve tracking")
			}
		})
	}

	const handleReject = async (id: string) => {
		if (!confirm("Are you sure you want to reject this tracking? It will be deleted.")) {
			return
		}

		startTransition(async () => {
			const result = await rejectTracking(id)
			if (result.success) {
				toast.success("Tracking rejected")
				router.refresh()
			} else {
				toast.error(result.error || "Failed to reject tracking")
			}
		})
	}

	const handleEdit = (item: PendingTrackingItem) => {
		setSelectedItem(item)
		setSelectedOrderId(item.order?.id || "")
		setEditDialogOpen(true)
	}

	const handleSaveEdit = async () => {
		if (!selectedItem || !selectedOrderId) return

		startTransition(async () => {
			const result = await updateTrackingOrder(selectedItem.id, selectedOrderId)
			if (result.success) {
				toast.success("Tracking updated")
				setEditDialogOpen(false)
				router.refresh()
			} else {
				toast.error(result.error || "Failed to update tracking")
			}
		})
	}

	const handleApproveAllMatched = async () => {
		const matched = items.filter((i) => i.order)
		if (!matched.length) {
			toast.error("No items with matched orders to approve")
			return
		}
		if (!confirm(`Approve ${matched.length} tracking item(s) with matched orders?`)) return
		setLoading(true)
		try {
			for (const item of matched) {
				await approveTracking(item.id)
			}
			router.refresh()
			toast.success(`Approved ${matched.length} tracking item(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to approve")
		} finally {
			setLoading(false)
		}
	}

	const filteredItems = sourceFilter === "all"
		? items
		: items.filter((i) => (i.source || "manual") === sourceFilter)

	const handleBulkReject = async () => {
		if (!confirm(`Are you sure you want to reject ${selectedIds.length} tracking item(s)? They will be deleted.`)) {
			return
		}
		setLoading(true)
		try {
			await bulkRejectPendingTracking(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Rejected ${selectedIds.length} tracking item(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to reject tracking items")
		} finally {
			setLoading(false)
		}
	}

	const getConfidenceBadge = (confidence: string | undefined) => {
		switch (confidence) {
			case "high":
				return <Badge variant="default" className="bg-green-500">High</Badge>
			case "medium":
				return <Badge variant="secondary">Medium</Badge>
			case "low":
				return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low</Badge>
			default:
				return <Badge variant="outline">Unknown</Badge>
		}
	}

	const getSourceIcon = (source: string | null) => {
		switch (source) {
			case "email":
				return <Mail className="h-4 w-4" />
			case "api":
				return <ExternalLink className="h-4 w-4" />
			default:
				return <Package className="h-4 w-4" />
		}
	}

	const columns: Column<PendingTrackingItem>[] = [
		{
			key: "source",
			header: "Source",
			cell: (row) => (
				<div className="flex items-center gap-2">
					{getSourceIcon(row.source)}
					<div className="flex flex-col">
						<span className="text-sm capitalize">{row.source || "manual"}</span>
						{row.sourceDetails?.sender && (
							<span className="text-xs text-muted-foreground truncate max-w-[150px]">
								{row.sourceDetails.sender}
							</span>
						)}
					</div>
				</div>
			),
		},
		{
			key: "trackingNumber",
			header: "Tracking Number",
			cell: (row) => (
				<code className="text-sm bg-muted px-2 py-1 rounded">
					{row.trackingNumber}
				</code>
			),
		},
		{
			key: "carrier",
			header: "Carrier",
			cell: (row) => (
				<span className="text-sm">
					{row.carrier?.name || <span className="text-muted-foreground">Unknown</span>}
				</span>
			),
		},
		{
			key: "order",
			header: "Matched Order",
			cell: (row) =>
				row.order ? (
					<div className="flex flex-col">
						<span className="font-medium">{row.order.orderNumber}</span>
						<span className="text-xs text-muted-foreground">
							{row.order.customerName}
						</span>
					</div>
				) : (
					<Badge variant="outline" className="border-red-500 text-red-600">
						No Match
					</Badge>
				),
		},
		{
			key: "confidence",
			header: "Confidence",
			cell: (row) => getConfidenceBadge(row.sourceDetails?.confidence),
		},
		{
			key: "createdAt",
			header: "Received",
			cell: (row) => (
				<span className="text-sm text-muted-foreground">
					{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
				</span>
			),
		},
		{
			key: "actions",
			header: "Actions",
			className: "text-right",
			cell: (row) => (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => handleEdit(row)}
						disabled={isPending}
						title="Edit order association"
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-green-600 hover:text-green-700 hover:bg-green-50"
						onClick={() => handleApprove(row.id, row.sourceDetails?.sender)}
						disabled={isPending || !row.order}
						title={row.order ? "Approve" : "Assign order first"}
					>
						<Check className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-red-600 hover:text-red-700 hover:bg-red-50"
						onClick={() => handleReject(row.id)}
						disabled={isPending}
						title="Reject"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			),
		},
	]

	return (
		<>
			<DataTable
				columns={columns}
				data={filteredItems}
				searchPlaceholder="Search pending tracking..."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				bulkActions={
					<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkReject}>
						Reject ({selectedIds.length})
					</Button>
				}
				filters={
					<>
						<Select value={sourceFilter} onValueChange={setSourceFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[150px]">
								<SelectValue placeholder="All Sources" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Sources</SelectItem>
								<SelectItem value="email">Email</SelectItem>
								<SelectItem value="api">API</SelectItem>
								<SelectItem value="manual">Manual</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" variant="outline" className="h-9" onClick={handleApproveAllMatched} disabled={loading || isPending}>
							Approve All Matched
						</Button>
					</>
				}
				emptyMessage="All caught up!"
				emptyDescription="No tracking numbers pending review."
			/>

			{/* Edit Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Tracking Association</DialogTitle>
						<DialogDescription>
							Update the order associated with this tracking number
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Tracking Number</Label>
							<Input
								value={selectedItem?.trackingNumber || ""}
								disabled
							/>
						</div>
						<div className="space-y-2">
							<Label>Carrier</Label>
							<Input
								value={selectedItem?.carrier?.name || "Unknown"}
								disabled
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="orderId">Order ID</Label>
							<Input
								id="orderId"
								value={selectedOrderId}
								onChange={(e) => setSelectedOrderId(e.target.value)}
								placeholder="Enter order ID or order number"
							/>
							<p className="text-xs text-muted-foreground">
								Enter the order ID to associate this tracking with
							</p>
						</div>
						{selectedItem?.sourceDetails?.subject && (
							<div className="space-y-2">
								<Label>Email Subject</Label>
								<p className="text-sm text-muted-foreground bg-muted p-2 rounded">
									{selectedItem.sourceDetails.subject}
								</p>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveEdit} disabled={isPending || !selectedOrderId}>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
