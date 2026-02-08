"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/data-table"
import { formatDate } from "@/lib/format"
import { createCarrier, deleteCarrier, updateCarrier, bulkDeleteCarriers } from "./actions"

interface Carrier {
	id: string
	name: string
	code: string
	trackingUrlTemplate: string | null
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}

interface CarriersTableProps {
	carriers: Carrier[]
	totalCount: number
	currentPage: number
}

export function CarriersTable({ carriers, totalCount, currentPage }: CarriersTableProps) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState("")
	const [code, setCode] = useState("")
	const [trackingUrl, setTrackingUrl] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			await bulkDeleteCarriers(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} carrier(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete carriers")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Carrier>[] = [
		{
			key: "name",
			header: "Carrier",
			cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
		},
		{
			key: "code",
			header: "Code",
			cell: (row) => <span className="text-xs font-mono text-muted-foreground">{row.code}</span>,
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => (
				<Badge
					variant="secondary"
					className={`text-[11px] px-1.5 py-0 border-0 ${
						row.isActive
							? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
							: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
					}`}
				>
					{row.isActive ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			key: "createdAt",
			header: "Added",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
			),
		},
	]

	const handleCreate = async () => {
		if (!name.trim() || !code.trim()) return
		setLoading(true)
		try {
			await createCarrier({
				name: name.trim(),
				code: code.trim().toLowerCase(),
				trackingUrlTemplate: trackingUrl.trim() || undefined,
			})
			toast.success("Carrier created")
			setCreateOpen(false)
			setName("")
			setCode("")
			setTrackingUrl("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to create carrier")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={statusFilter === "all" ? carriers : carriers.filter((c) => statusFilter === "active" ? c.isActive : !c.isActive)}
				searchPlaceholder="Search carriers..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/shipping/${row.id}`)}
				emptyMessage="No carriers configured"
				emptyDescription="Add a shipping carrier to get started."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				filters={
					<>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[160px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setCreateOpen(true)}>Add Carrier</Button>
					</>
				}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Carrier</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UPS" />
						</div>
						<div>
							<Label>Code</Label>
							<Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ups" />
						</div>
						<div>
							<Label>Tracking URL Template (optional)</Label>
							<Input
								value={trackingUrl}
								onChange={(e) => setTrackingUrl(e.target.value)}
								placeholder="https://track.example.com/?id={tracking_number}"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={loading || !name.trim() || !code.trim()}>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
