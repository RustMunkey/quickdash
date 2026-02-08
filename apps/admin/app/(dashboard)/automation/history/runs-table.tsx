"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { DataTable, Column } from "@/components/data-table"
import { formatDistanceToNow, format } from "date-fns"
import { toast } from "sonner"
import { bulkDeleteRuns } from "../actions"

type WorkflowRunItem = {
	id: string
	workflowId: string
	workflowName: string
	triggerEvent: string
	status: "pending" | "running" | "completed" | "failed" | "cancelled"
	stepsCompleted: number
	totalSteps: number
	error: string | null
	startedAt: Date | null
	completedAt: Date | null
	createdAt: Date
}

interface RunsTableProps {
	runs: WorkflowRunItem[]
	totalCount: number
	currentPage: number
}

function getStatusBadge(status: string) {
	switch (status) {
		case "pending":
			return <Badge variant="secondary">Pending</Badge>
		case "running":
			return <Badge variant="default">Running</Badge>
		case "completed":
			return <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>
		case "failed":
			return <Badge variant="destructive">Failed</Badge>
		case "cancelled":
			return <Badge variant="outline">Cancelled</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

export function RunsTable({ runs, totalCount, currentPage }: RunsTableProps) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = React.useState("all")
	const [loading, setLoading] = React.useState(false)
	const [selectedIds, setSelectedIds] = React.useState<string[]>([])

	const handleBulkDelete = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			await bulkDeleteRuns(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} run(s)`)
		} catch (err: any) {
			toast.error(err.message || "Failed to delete runs")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<WorkflowRunItem>[] = [
		{
			key: "workflow",
			header: "Workflow",
			cell: (run) => (
				<div>
					<p className="font-medium">{run.workflowName}</p>
					<p className="text-xs text-muted-foreground">{run.triggerEvent}</p>
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (run) => getStatusBadge(run.status),
		},
		{
			key: "progress",
			header: "Progress",
			cell: (run) => (
				<div>
					<p className="text-sm">
						{run.stepsCompleted} / {run.totalSteps} steps
					</p>
					{run.error && (
						<p className="text-xs text-destructive line-clamp-1">{run.error}</p>
					)}
				</div>
			),
		},
		{
			key: "duration",
			header: "Duration",
			cell: (run) => {
				if (!run.startedAt) return <span className="text-muted-foreground">—</span>
				if (!run.completedAt) {
					return (
						<span className="text-muted-foreground">
							Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
						</span>
					)
				}
				const duration = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
				const seconds = Math.floor(duration / 1000)
				if (seconds < 60) return `${seconds}s`
				const minutes = Math.floor(seconds / 60)
				return `${minutes}m ${seconds % 60}s`
			},
		},
		{
			key: "createdAt",
			header: "Started",
			cell: (run) => (
				<div>
					<p className="text-sm">
						{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
					</p>
					<p className="text-xs text-muted-foreground">
						{format(new Date(run.createdAt), "MMM d, h:mm a")}
					</p>
				</div>
			),
		},
		{
			key: "actions",
			header: "",
			cell: (run) => (
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					onClick={(e) => {
						e.stopPropagation()
						// Future: Open run details modal
					}}
				>
					<HugeiconsIcon icon={ViewIcon} size={16} />
				</Button>
			),
		},
	]

	const filteredRuns = statusFilter === "all" ? runs : runs.filter((r) => r.status === statusFilter)

	return (
		<DataTable
			columns={columns}
			data={filteredRuns}
			totalCount={totalCount}
			currentPage={currentPage}
			pageSize={25}
			getId={(row) => row.id}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			emptyMessage="No workflow runs yet. Activate a workflow to see executions here."
			filters={
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="h-9 w-[130px] text-xs">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="running">Running</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="failed">Failed</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>
			}
		/>
	)
}
