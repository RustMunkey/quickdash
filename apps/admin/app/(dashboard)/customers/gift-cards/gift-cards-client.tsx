"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/status-badge"
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
import { createGiftCard, bulkDeleteGiftCards } from "./actions"
import { formatCurrency, formatDate } from "@/lib/format"

interface GiftCard {
	id: string
	code: string
	initialBalance: string
	currentBalance: string
	issuedTo: string | null
	status: string
	expiresAt: Date | null
	createdAt: Date
}

interface GiftCardsClientProps {
	cards: GiftCard[]
	totalCount: number
	currentPage: number
}


export function GiftCardsClient({ cards, totalCount, currentPage }: GiftCardsClientProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [statusFilter, setStatusFilter] = useState("all")
	const [balance, setBalance] = useState("")
	const [issuedTo, setIssuedTo] = useState("")
	const [expiresAt, setExpiresAt] = useState("")
	const [saving, setSaving] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		if (!selectedIds.length) return
		setLoading(true)
		try {
			await bulkDeleteGiftCards(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} gift card(s)`)
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	async function handleCreate() {
		if (!balance || parseFloat(balance) <= 0) {
			toast.error("Enter a valid balance")
			return
		}
		setSaving(true)
		try {
			await createGiftCard({
				initialBalance: balance,
				issuedTo: issuedTo || undefined,
				expiresAt: expiresAt || undefined,
			})
			toast.success("Gift card created")
			setOpen(false)
			setBalance("")
			setIssuedTo("")
			setExpiresAt("")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create")
		} finally {
			setSaving(false)
		}
	}

	const filtered = statusFilter === "all"
		? cards
		: cards.filter((c) => c.status === statusFilter)

	const columns: Column<GiftCard>[] = [
		{
			key: "code",
			header: "Code",
			cell: (row) => <span className="text-sm font-mono">{row.code}</span>,
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="giftCard" />,
		},
		{
			key: "balance",
			header: "Balance",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{formatCurrency(row.currentBalance)}</span>
					<p className="text-xs text-muted-foreground">of {formatCurrency(row.initialBalance)}</p>
				</div>
			),
		},
		{
			key: "expires",
			header: "Expires",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.expiresAt ? formatDate(row.expiresAt) : "Never"}
				</span>
			),
		},
		{
			key: "created",
			header: "Created",
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
				searchPlaceholder="Search gift cards..."
				getId={(row) => row.id}
				onRowClick={(row) => router.push(`/customers/gift-cards/${row.id}`)}
				emptyMessage="No gift cards yet"
				emptyDescription="Create gift cards to issue to customers."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
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
							<SelectTrigger className="h-9 w-full sm:w-[150px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="used">Used</SelectItem>
								<SelectItem value="expired">Expired</SelectItem>
								<SelectItem value="deactivated">Deactivated</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setOpen(true)}>Add Card</Button>
					</>
				}
			/>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Gift Card</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>Initial Balance ($)</Label>
							<Input
								type="number"
								step="0.01"
								min="0.01"
								value={balance}
								onChange={(e) => setBalance(e.target.value)}
								placeholder="50.00"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Issue To (optional)</Label>
							<Input
								value={issuedTo}
								onChange={(e) => setIssuedTo(e.target.value)}
								placeholder="User ID (optional)"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Expires (optional)</Label>
							<Input
								type="date"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
							/>
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
