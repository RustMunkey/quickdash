"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { createSupplier, bulkDeleteSuppliers } from "./actions"

interface Supplier {
	id: string
	name: string
	contactEmail: string | null
	contactPhone: string | null
	website: string | null
	country: string | null
	averageLeadTimeDays: string | null
	createdAt: Date
}

interface SuppliersTableProps {
	suppliers: Supplier[]
	totalCount: number
	currentPage: number
}

export function SuppliersTable({ suppliers, totalCount, currentPage }: SuppliersTableProps) {
	const router = useRouter()
	const [countryFilter, setCountryFilter] = useState("all")
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [phone, setPhone] = useState("")
	const [country, setCountry] = useState("")
	const [leadTime, setLeadTime] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteSuppliers(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} supplier(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete suppliers")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Supplier>[] = [
		{
			key: "name",
			header: "Supplier",
			cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
		},
		{
			key: "contact",
			header: "Contact",
			cell: (row) => (
				<div>
					{row.contactEmail && <span className="text-xs text-muted-foreground">{row.contactEmail}</span>}
					{row.contactPhone && <span className="block text-xs text-muted-foreground">{row.contactPhone}</span>}
					{!row.contactEmail && !row.contactPhone && <span className="text-xs text-muted-foreground">—</span>}
				</div>
			),
		},
		{
			key: "country",
			header: "Country",
			cell: (row) => (
				<span className="text-sm">{row.country ?? "—"}</span>
			),
		},
		{
			key: "leadTime",
			header: "Lead Time",
			cell: (row) => (
				<span className="text-sm">
					{row.averageLeadTimeDays ? `${row.averageLeadTimeDays} days` : "—"}
				</span>
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
		if (!name.trim()) return
		setLoading(true)
		try {
			await createSupplier({
				name: name.trim(),
				contactEmail: email.trim() || undefined,
				contactPhone: phone.trim() || undefined,
				country: country.trim() || undefined,
				averageLeadTimeDays: leadTime.trim() || undefined,
			})
			toast.success("Supplier created")
			setCreateOpen(false)
			setName("")
			setEmail("")
			setPhone("")
			setCountry("")
			setLeadTime("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to create supplier")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={countryFilter === "all" ? suppliers : suppliers.filter((s) => s.country === countryFilter)}
				searchPlaceholder="Search suppliers..."
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				emptyMessage="No suppliers"
				emptyDescription="Add a supplier to manage your product sourcing."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				filters={
					<>
						<Select value={countryFilter} onValueChange={setCountryFilter}>
							<SelectTrigger className="h-9 w-full sm:w-[160px]">
								<SelectValue placeholder="All Countries" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Countries</SelectItem>
								{[...new Set(suppliers.map((s) => s.country).filter(Boolean) as string[])].sort().map((c) => (
									<SelectItem key={c} value={c}>{c}</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setCreateOpen(true)}>Add Supplier</Button>
					</>
				}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Supplier</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Mountain Roasters" />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Email</Label>
								<Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
							</div>
							<div>
								<Label>Phone</Label>
								<Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0100" />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Country</Label>
								<Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" />
							</div>
							<div>
								<Label>Lead Time (days)</Label>
								<Input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="7" />
							</div>
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
