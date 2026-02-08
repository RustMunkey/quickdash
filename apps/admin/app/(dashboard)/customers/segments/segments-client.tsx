"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/data-table"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createSegment, deleteSegment, bulkDeleteSegments } from "./actions"

interface Segment {
	id: string
	name: string
	description: string | null
	type: string
	rules: unknown
	color: string | null
	memberCount: number
	createdAt: Date
}

interface SegmentsClientProps {
	segments: Segment[]
	totalCount: number
	currentPage: number
}

const COLORS = [
	{ label: "Gray", value: "gray" },
	{ label: "Red", value: "#ef4444" },
	{ label: "Orange", value: "#f97316" },
	{ label: "Yellow", value: "#eab308" },
	{ label: "Green", value: "#22c55e" },
	{ label: "Blue", value: "#3b82f6" },
	{ label: "Purple", value: "#a855f7" },
	{ label: "Pink", value: "#ec4899" },
]

export function SegmentsClient({ segments, totalCount, currentPage }: SegmentsClientProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [description, setDescription] = useState("")
	const [type, setType] = useState("manual")
	const [color, setColor] = useState("gray")
	const [saving, setSaving] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteSegments(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} segment(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	async function handleCreate() {
		if (!name.trim()) {
			toast.error("Name is required")
			return
		}
		setSaving(true)
		try {
			await createSegment({ name: name.trim(), description, type, color })
			toast.success("Segment created")
			setOpen(false)
			setName("")
			setDescription("")
			setType("manual")
			setColor("gray")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create segment")
		} finally {
			setSaving(false)
		}
	}

	async function handleDelete(id: string, segName: string) {
		if (!confirm(`Delete segment "${segName}"? Members will be removed.`)) return
		try {
			await deleteSegment(id)
			toast.success("Segment deleted")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete")
		}
	}

	const columns: Column<Segment>[] = [
		{
			key: "name",
			header: "Segment",
			cell: (row) => (
				<div className="flex items-center gap-3">
					<div
						className="w-3 h-3 rounded-full shrink-0"
						style={{ backgroundColor: row.color || "#888" }}
					/>
					<div>
						<span className="text-sm font-medium">{row.name}</span>
						{row.description && (
							<p className="text-xs text-muted-foreground">{row.description}</p>
						)}
					</div>
				</div>
			),
		},
		{
			key: "type",
			header: "Type",
			cell: (row) => (
				<Badge variant="secondary" className="text-[10px]">
					{row.type}
				</Badge>
			),
		},
		{
			key: "members",
			header: "Members",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.memberCount}
				</span>
			),
		},
		{
			key: "actions",
			header: "",
			cell: (row) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						className="text-xs text-destructive hover:text-destructive"
						onClick={(e) => {
							e.stopPropagation()
							handleDelete(row.id, row.name)
						}}
					>
						Delete
					</Button>
				</div>
			),
		},
	]

	return (
		<>
			<DataTable
				columns={columns}
				data={segments}
				searchPlaceholder="Search segments..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/customers/segments/${row.id}`)}
				emptyMessage="No segments yet"
				emptyDescription="Create segments to organize customers into groups."
				totalCount={totalCount}
				currentPage={currentPage}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={
					<Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={loading}>
						Delete ({selectedIds.length})
					</Button>
				}
				filters={
					<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setOpen(true)}>Create Segment</Button>
				}
			/>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Segment</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>Name</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. VIP Customers"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Description</Label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>Type</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="manual">Manual</SelectItem>
										<SelectItem value="rule-based">Rule-based</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>Color</Label>
								<Select value={color} onValueChange={setColor}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{COLORS.map((c) => (
											<SelectItem key={c.value} value={c.value}>
												<div className="flex items-center gap-2">
													<div
														className="w-3 h-3 rounded-full"
														style={{ backgroundColor: c.value === "gray" ? "#888" : c.value }}
													/>
													{c.label}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreate} disabled={saving}>
								{saving ? "Creating..." : "Create"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
