"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { bulkDeleteActivityLogs } from "./actions"

interface AuditEntry {
	id: string
	userName: string
	userEmail: string
	action: string
	targetType: string | null
	targetId: string | null
	targetLabel: string | null
	createdAt: Date
}

const actionLabels: Record<string, string> = {
	"auth.sign_in": "Signed in",
	"auth.sign_out": "Signed out",
	"invite.created": "Invited member",
	"invite.revoked": "Revoked invite",
	"member.removed": "Removed member",
	"member.role_changed": "Changed role",
	"product.created": "Created product",
	"product.updated": "Updated product",
	"product.deleted": "Deleted product",
	"order.updated": "Updated order",
	"order.fulfilled": "Fulfilled order",
	"order.refunded": "Refunded order",
}

const actionColors: Record<string, string> = {
	"auth.sign_in": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	"auth.sign_out": "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	"invite.created": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"invite.revoked": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
	"member.removed": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	"member.role_changed": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
	"product.created": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"product.updated": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"product.deleted": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	"order.updated": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	"order.fulfilled": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	"order.refunded": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

export function ActivityLogClient({ entries, totalCount, currentPage }: {
	entries: AuditEntry[]
	totalCount: number
	currentPage: number
}) {
	const router = useRouter()
	const [categoryFilter, setCategoryFilter] = useState("all")
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteActivityLogs(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} log(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<AuditEntry>[] = [
		{
			key: "user",
			header: "User",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.userName}</span>
					<span className="block text-xs text-muted-foreground">{row.userEmail}</span>
				</div>
			),
		},
		{
			key: "action",
			header: "Action",
			cell: (row) => (
				<Badge
					variant="secondary"
					className={`text-[10px] px-1.5 py-0 ${actionColors[row.action] ?? ""}`}
				>
					{actionLabels[row.action] ?? row.action}
				</Badge>
			),
		},
		{
			key: "target",
			header: "Target",
			cell: (row) => (
				<span className="text-sm text-muted-foreground">
					{row.targetLabel ?? "—"}
				</span>
			),
		},
		{
			key: "date",
			header: "Date",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{formatDate(row.createdAt)}
				</span>
			),
		},
	]

	const filteredEntries = categoryFilter === "all"
		? entries
		: entries.filter((e) => e.action.startsWith(categoryFilter))

	return (
		<DataTable
			columns={columns}
			data={filteredEntries}
			searchPlaceholder="Search activity..."
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			getId={(row) => row.id}
			emptyMessage="No activity yet"
			emptyDescription="Actions like sign-ins, invites, and changes will appear here."
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			bulkActions={
				<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
					Delete ({selectedIds.length})
				</Button>
			}
			filters={
				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="h-9 w-full sm:w-40">
						<SelectValue placeholder="All Actions" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Actions</SelectItem>
						<SelectItem value="auth">Authentication</SelectItem>
						<SelectItem value="member">Members</SelectItem>
						<SelectItem value="invite">Invites</SelectItem>
						<SelectItem value="product">Products</SelectItem>
						<SelectItem value="order">Orders</SelectItem>
					</SelectContent>
				</Select>
			}
		/>
	)
}
