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
import { createContact, bulkDeleteContacts } from "./actions"

interface Contact {
	id: string
	firstName: string
	lastName: string
	email: string | null
	phone: string | null
	jobTitle: string | null
	status: string
	source: string | null
	companyId: string | null
	companyName: string | null
	createdAt: Date
}

interface ContactsTableProps {
	contacts: Contact[]
	totalCount: number
}

function getStatusBadge(status: string) {
	switch (status) {
		case "lead":
			return <Badge variant="secondary">Lead</Badge>
		case "qualified":
			return <Badge variant="outline">Qualified</Badge>
		case "customer":
			return <Badge className="bg-green-600 hover:bg-green-600">Customer</Badge>
		case "churned":
			return <Badge variant="destructive">Churned</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

export function ContactsTable({ contacts, totalCount }: ContactsTableProps) {
	const router = useRouter()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [statusFilter, setStatusFilter] = useState("all")
	const [open, setOpen] = useState(false)
	const [firstName, setFirstName] = useState("")
	const [lastName, setLastName] = useState("")
	const [email, setEmail] = useState("")
	const [phone, setPhone] = useState("")
	const [saving, setSaving] = useState(false)

	const filtered = statusFilter === "all"
		? contacts
		: contacts.filter((c) => c.status === statusFilter)

	async function handleCreate() {
		if (!firstName.trim() || !lastName.trim()) {
			toast.error("First and last name are required")
			return
		}
		setSaving(true)
		try {
			await createContact({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				email: email || undefined,
				phone: phone || undefined,
			})
			toast.success("Contact created")
			setOpen(false)
			setFirstName("")
			setLastName("")
			setEmail("")
			setPhone("")
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
			await bulkDeleteContacts(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`${selectedIds.length} contact(s) deleted`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<Contact>[] = [
		{
			key: "name",
			header: "Name",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.firstName} {row.lastName}</span>
					{row.jobTitle && (
						<p className="text-xs text-muted-foreground">{row.jobTitle}</p>
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
			key: "company",
			header: "Company",
			cell: (row) => (
				<span className="text-sm text-muted-foreground">{row.companyName || "—"}</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => getStatusBadge(row.status),
		},
		{
			key: "source",
			header: "Source",
			cell: (row) => (
				<span className="text-xs text-muted-foreground capitalize">{row.source || "—"}</span>
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
				data={filtered}
				totalCount={totalCount}
				searchPlaceholder="Search contacts..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/sales/contacts/${row.id}`)}
				emptyMessage="No contacts yet"
				emptyDescription="Add your first contact to get started with CRM."
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
								<SelectItem value="lead">Lead</SelectItem>
								<SelectItem value="qualified">Qualified</SelectItem>
								<SelectItem value="customer">Customer</SelectItem>
								<SelectItem value="churned">Churned</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setOpen(true)}>Add Contact</Button>
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
						<DialogTitle>Add Contact</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label>First Name</Label>
								<Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
							</div>
							<div className="space-y-1.5">
								<Label>Last Name</Label>
								<Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
							</div>
						</div>
						<div className="space-y-1.5">
							<Label>Email</Label>
							<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
						</div>
						<div className="space-y-1.5">
							<Label>Phone</Label>
							<Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
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
