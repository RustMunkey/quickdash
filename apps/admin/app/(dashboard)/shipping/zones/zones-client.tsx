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
import { createZone, bulkDeleteZones } from "../actions"

interface Zone {
	id: string
	name: string
	countries: string[] | null
	regions: string[] | null
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}

interface ZonesClientProps {
	zones: Zone[]
	totalCount: number
	currentPage: number
}

export function ZonesClient({ zones, totalCount, currentPage }: ZonesClientProps) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState("")
	const [countries, setCountries] = useState("")
	const [regions, setRegions] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteZones(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} zone(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Zone>[] = [
		{
			key: "name",
			header: "Zone",
			cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
		},
		{
			key: "countries",
			header: "Countries",
			cell: (row) => {
				const list = row.countries ?? []
				if (list.length === 0) return <span className="text-xs text-muted-foreground">—</span>
				return (
					<div className="flex flex-wrap gap-1">
						{list.slice(0, 3).map((c) => (
							<Badge key={c} variant="secondary" className="text-[10px] px-1 py-0 border-0">
								{c}
							</Badge>
						))}
						{list.length > 3 && (
							<span className="text-[10px] text-muted-foreground">+{list.length - 3}</span>
						)}
					</div>
				)
			},
		},
		{
			key: "regions",
			header: "Regions",
			cell: (row) => {
				const list = row.regions ?? []
				if (list.length === 0) return <span className="text-xs text-muted-foreground">—</span>
				return (
					<span className="text-xs text-muted-foreground">{list.join(", ")}</span>
				)
			},
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
	]

	const handleCreate = async () => {
		if (!name.trim()) return
		setLoading(true)
		try {
			await createZone({
				name: name.trim(),
				countries: countries.trim() ? countries.split(",").map((s) => s.trim()) : undefined,
				regions: regions.trim() ? regions.split(",").map((s) => s.trim()) : undefined,
			})
			toast.success("Zone created")
			setCreateOpen(false)
			setName("")
			setCountries("")
			setRegions("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to create zone")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={statusFilter === "all" ? zones : zones.filter((z) => statusFilter === "active" ? z.isActive : !z.isActive)}
				searchPlaceholder="Search zones..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/shipping/zones/${row.id}`)}
				emptyMessage="No shipping zones"
				emptyDescription="Create zones to configure regional shipping rates."
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
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setCreateOpen(true)}>Add Zone</Button>
					</>
				}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Zone</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. North America" />
						</div>
						<div>
							<Label>Countries (comma-separated)</Label>
							<Input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="US, CA, MX" />
						</div>
						<div>
							<Label>Regions (comma-separated, optional)</Label>
							<Input value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="West Coast, East Coast" />
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
