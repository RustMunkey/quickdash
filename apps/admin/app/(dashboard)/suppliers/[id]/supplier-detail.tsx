"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateSupplier, deleteSupplier } from "../actions"

interface SupplierDetailProps {
	supplier: {
		id: string
		name: string
		contactEmail: string | null
		contactPhone: string | null
		website: string | null
		country: string | null
		averageLeadTimeDays: string | null
		shippingMethods: string[] | null
		notes: string | null
		createdAt: Date
		updatedAt: Date
	}
}

export function SupplierDetail({ supplier }: SupplierDetailProps) {
	const router = useRouter()
	const [editOpen, setEditOpen] = useState(false)
	const [name, setName] = useState(supplier.name)
	const [email, setEmail] = useState(supplier.contactEmail ?? "")
	const [phone, setPhone] = useState(supplier.contactPhone ?? "")
	const [website, setWebsite] = useState(supplier.website ?? "")
	const [country, setCountry] = useState(supplier.country ?? "")
	const [leadTime, setLeadTime] = useState(supplier.averageLeadTimeDays ?? "")
	const [notes, setNotes] = useState(supplier.notes ?? "")
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(supplier.id, supplier.name)

	const handleUpdate = async () => {
		setLoading(true)
		try {
			await updateSupplier(supplier.id, {
				name: name.trim(),
				contactEmail: email.trim() || undefined,
				contactPhone: phone.trim() || undefined,
				website: website.trim() || undefined,
				country: country.trim() || undefined,
				averageLeadTimeDays: leadTime.trim() || undefined,
				notes: notes.trim() || undefined,
			})
			toast.success("Supplier updated")
			setEditOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		setLoading(true)
		try {
			await deleteSupplier(supplier.id)
			toast.success("Supplier deleted")
			router.push("/suppliers")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">{supplier.name}</h2>
					<p className="text-sm text-muted-foreground">{supplier.country ?? "No country set"}</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={loading}>
						Edit
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete {supplier.name}?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this supplier. Purchase orders will not be affected.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Contact Information</h3>
						<div className="grid gap-3 sm:grid-cols-2 text-sm">
							<div>
								<span className="text-muted-foreground text-xs">Email</span>
								<p>{supplier.contactEmail ?? "—"}</p>
							</div>
							<div>
								<span className="text-muted-foreground text-xs">Phone</span>
								<p>{supplier.contactPhone ?? "—"}</p>
							</div>
							<div>
								<span className="text-muted-foreground text-xs">Website</span>
								{supplier.website ? (
									<a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all">
										{supplier.website}
									</a>
								) : (
									<p>—</p>
								)}
							</div>
							<div>
								<span className="text-muted-foreground text-xs">Country</span>
								<p>{supplier.country ?? "—"}</p>
							</div>
						</div>
					</div>

					{supplier.notes && (
						<div className="rounded-lg border p-4">
							<h3 className="text-sm font-medium mb-2">Notes</h3>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Lead Time</span>
								<span>{supplier.averageLeadTimeDays ? `${supplier.averageLeadTimeDays} days` : "—"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Added</span>
								<span>{formatDate(supplier.createdAt)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span>{formatDate(supplier.updatedAt)}</span>
							</div>
						</div>
					</div>

					{(supplier.shippingMethods ?? []).length > 0 && (
						<div className="rounded-lg border p-4 space-y-2">
							<h3 className="text-sm font-medium">Shipping Methods</h3>
							<div className="space-y-1">
								{(supplier.shippingMethods ?? []).map((m) => (
									<p key={m} className="text-sm text-muted-foreground">{m}</p>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Supplier</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Email</Label>
								<Input value={email} onChange={(e) => setEmail(e.target.value)} />
							</div>
							<div>
								<Label>Phone</Label>
								<Input value={phone} onChange={(e) => setPhone(e.target.value)} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Website</Label>
								<Input value={website} onChange={(e) => setWebsite(e.target.value)} />
							</div>
							<div>
								<Label>Country</Label>
								<Input value={country} onChange={(e) => setCountry(e.target.value)} />
							</div>
						</div>
						<div>
							<Label>Lead Time (days)</Label>
							<Input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
						</div>
						<div>
							<Label>Notes</Label>
							<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
						<Button onClick={handleUpdate} disabled={loading || !name.trim()}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
