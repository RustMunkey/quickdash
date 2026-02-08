"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import { createTask, updateTaskStatus, bulkDeleteTasks } from "./actions"

interface Task {
	id: string
	title: string
	description: string | null
	dueDate: Date | null
	priority: string | null
	status: string | null
	contactId: string | null
	contactName: string | null
	contactLastName: string | null
	completedAt: Date | null
	createdAt: Date
}

interface TasksTableProps {
	tasks: Task[]
	totalCount: number
}

function getPriorityBadge(priority: string | null) {
	switch (priority) {
		case "urgent":
			return <Badge variant="destructive">Urgent</Badge>
		case "high":
			return <Badge className="bg-orange-600 hover:bg-orange-600">High</Badge>
		case "medium":
			return <Badge variant="secondary">Medium</Badge>
		case "low":
			return <Badge variant="outline">Low</Badge>
		default:
			return <Badge variant="secondary">{priority || "—"}</Badge>
	}
}

function getStatusBadge(status: string | null) {
	switch (status) {
		case "pending":
			return <Badge variant="outline">Pending</Badge>
		case "in_progress":
			return <Badge variant="default">In Progress</Badge>
		case "completed":
			return <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>
		case "canceled":
			return <Badge variant="destructive">Canceled</Badge>
		default:
			return <Badge variant="secondary">{status || "—"}</Badge>
	}
}

export function TasksTable({ tasks, totalCount }: TasksTableProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [statusFilter, setStatusFilter] = useState("all")
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [dueDate, setDueDate] = useState("")
	const [priority, setPriority] = useState("medium")
	const [saving, setSaving] = useState(false)

	const filtered = statusFilter === "all"
		? tasks
		: tasks.filter((t) => t.status === statusFilter)

	async function handleCreate() {
		if (!title.trim()) {
			toast.error("Title is required")
			return
		}
		setSaving(true)
		try {
			await createTask({
				title: title.trim(),
				description: description || undefined,
				dueDate: dueDate || undefined,
				priority,
			})
			toast.success("Task created")
			setOpen(false)
			setTitle("")
			setDescription("")
			setDueDate("")
			setPriority("medium")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create")
		} finally {
			setSaving(false)
		}
	}

	async function handleToggleComplete(id: string, currentStatus: string | null) {
		try {
			const newStatus = currentStatus === "completed" ? "pending" : "completed"
			await updateTaskStatus(id, newStatus)
			router.refresh()
		} catch (err) {
			toast.error("Failed to update task")
		}
	}

	async function handleBulkDelete() {
		setLoading(true)
		try {
			await bulkDeleteTasks(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`${selectedIds.length} task(s) deleted`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Task>[] = [
		{
			key: "title",
			header: "Task",
			cell: (row) => (
				<div>
					<span className={`text-sm font-medium ${row.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
						{row.title}
					</span>
					{row.contactName && (
						<p className="text-xs text-muted-foreground">
							{row.contactName} {row.contactLastName}
						</p>
					)}
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => getStatusBadge(row.status),
		},
		{
			key: "priority",
			header: "Priority",
			cell: (row) => getPriorityBadge(row.priority),
		},
		{
			key: "dueDate",
			header: "Due",
			cell: (row) => {
				if (!row.dueDate) return <span className="text-xs text-muted-foreground">—</span>
				const isOverdue = row.status !== "completed" && new Date(row.dueDate) < new Date()
				return (
					<span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
						{formatDate(row.dueDate)}
					</span>
				)
			},
		},
		{
			key: "actions",
			header: "",
			cell: (row) => (
				<Button
					variant="ghost"
					size="sm"
					className="text-xs"
					onClick={(e) => {
						e.stopPropagation()
						handleToggleComplete(row.id, row.status)
					}}
				>
					{row.status === "completed" ? "Reopen" : "Complete"}
				</Button>
			),
		},
	]

	return (
		<>
			<DataTable
				columns={columns}
				data={filtered}
				totalCount={totalCount}
				searchPlaceholder="Search tasks..."
				getId={(row) => row.id}
				emptyMessage="No tasks yet"
				emptyDescription="Create tasks to track follow-ups with contacts and deals."
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				filters={
					<>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[140px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="canceled">Canceled</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setOpen(true)}>Add Task</Button>
					</>
				}
				bulkActions={
					<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDelete}>
						Delete ({selectedIds.length})
					</Button>
				}
			/>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Task</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>Title</Label>
							<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with client" />
						</div>
						<div className="space-y-1.5">
							<Label>Description</Label>
							<Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>Due Date</Label>
								<Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
							</div>
							<div className="space-y-1.5">
								<Label>Priority</Label>
								<Select value={priority} onValueChange={setPriority}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
							<Button onClick={handleCreate} disabled={saving}>
								{saving ? "Adding..." : "Add"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
