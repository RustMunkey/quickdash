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
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/format"
import { createCompany, bulkDeleteCompanies } from "../contacts/actions"

interface Company {
	id: string
	name: string
	website: string | null
	industry: string | null
	size: string | null
	phone: string | null
	email: string | null
	annualRevenue: string | null
	createdAt: Date
	contactCount: number
}

interface CompaniesTableProps {
	companies: Company[]
	totalCount: number
}

export function CompaniesTable({ companies, totalCount }: CompaniesTableProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [website, setWebsite] = useState("")
	const [industry, setIndustry] = useState("")
	const [email, setEmail] = useState("")
	const [saving, setSaving] = useState(false)

	async function handleCreate() {
		if (!name.trim()) {
			toast.error("Company name is required")
			return
		}
		setSaving(true)
		try {
			await createCompany({
				name: name.trim(),
				website: website || undefined,
				industry: industry || undefined,
				email: email || undefined,
			})
			toast.success("Company created")
			setOpen(false)
			setName("")
			setWebsite("")
			setIndustry("")
			setEmail("")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create")
		} finally {
			setSaving(false)
		}
	}

	async function handleBulkDelete() {
		setLoading(true)
		try {
			await bulkDeleteCompanies(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`${selectedIds.length} company(s) deleted`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Company>[] = [
		{
			key: "name",
			header: "Company",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.name}</span>
					{row.industry && (
						<p className="text-xs text-muted-foreground">{row.industry}</p>
					)}
				</div>
			),
		},
		{
			key: "email",
			header: "Email",
			cell: (row) => (
				<span className="text-sm text-muted-foreground">{row.email || "—"}</span>
			),
		},
		{
			key: "size",
			header: "Size",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{row.size || "—"}</span>
			),
		},
		{
			key: "contacts",
			header: "Contacts",
			cell: (row) => (
				<span className="text-sm">{row.contactCount}</span>
			),
		},
		{
			key: "revenue",
			header: "Revenue",
			cell: (row) => (
				<span className="text-sm text-muted-foreground">
					{row.annualRevenue ? `$${parseFloat(row.annualRevenue).toLocaleString()}` : "—"}
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

	return (
		<>
			<DataTable
				columns={columns}
				data={companies}
				totalCount={totalCount}
				searchPlaceholder="Search companies..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/sales/companies/${row.id}`)}
				emptyMessage="No companies yet"
				emptyDescription="Add companies to organize your B2B relationships."
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				filters={
					<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setOpen(true)}>Add Company</Button>
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
						<DialogTitle>Add Company</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>Company Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
						</div>
						<div className="space-y-1.5">
							<Label>Website</Label>
							<Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>Industry</Label>
								<Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
							</div>
							<div className="space-y-1.5">
								<Label>Email</Label>
								<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@acme.com" />
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
