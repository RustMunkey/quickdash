"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
	DialogFooter,
} from "@/components/ui/dialog"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { usePaginationParams } from "@/hooks/use-table-params"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { createDiscount, toggleDiscount, bulkDeleteDiscounts } from "./actions"

interface Discount {
	id: string
	name: string
	code: string | null
	discountType: string | null
	valueType: string
	value: string
	minimumOrderAmount: string | null
	maxUses: number | null
	currentUses: number | null
	isActive: boolean | null
	isStackable: boolean | null
	startsAt: Date | null
	expiresAt: Date | null
	createdAt: Date
}

interface DiscountsTableProps {
	discounts: Discount[]
	totalCount: number
}

export function DiscountsTable({ discounts, totalCount }: DiscountsTableProps) {
	const router = useRouter()
	const [params, setParams] = usePaginationParams()
	const [statusFilter, setStatusFilter] = useQueryState(
		"status",
		parseAsStringLiteral(["all", "active", "inactive", "expired"] as const).withDefault("all")
	)
	const [createOpen, setCreateOpen] = useState(false)
	const [name, setName] = useState("")
	const [code, setCode] = useState("")
	const [valueType, setValueType] = useState("percentage")
	const [value, setValue] = useState("")
	const [minOrder, setMinOrder] = useState("")
	const [maxUses, setMaxUses] = useState("")
	const [expiresAt, setExpiresAt] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteDiscounts(selectedIds)
			toast.success(`Deleted ${selectedIds.length} discount(s)`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	function getStatus(d: Discount): string {
		if (!d.isActive) return "inactive"
		if (d.expiresAt && new Date(d.expiresAt) < new Date()) return "expired"
		if (d.maxUses && d.currentUses && d.currentUses >= d.maxUses) return "exhausted"
		return "active"
	}

	const filtered = statusFilter === "all"
		? discounts
		: discounts.filter((d) => getStatus(d) === statusFilter)

	const columns: Column<Discount>[] = [
		{
			key: "code",
			header: "Code",
			cell: (row) => (
				<div>
					<span className="text-sm font-mono font-medium">{row.code || "—"}</span>
					<p className="text-xs text-muted-foreground">{row.name}</p>
				</div>
			),
		},
		{
			key: "value",
			header: "Discount",
			cell: (row) => (
				<span className="text-sm font-medium">
					{row.valueType === "percentage" ? `${row.value}%` : formatCurrency(row.value)}
				</span>
			),
		},
		{
			key: "minOrder",
			header: "Min Order",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">
					{row.minimumOrderAmount ? formatCurrency(row.minimumOrderAmount) : "—"}
				</span>
			),
		},
		{
			key: "uses",
			header: "Uses",
			cell: (row) => (
				<span className="text-sm">
					{row.currentUses ?? 0}{row.maxUses ? ` / ${row.maxUses}` : ""}
				</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => {
				const status = getStatus(row)
				const colors: Record<string, string> = {
					active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
					inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
					expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
					exhausted: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
				}
				return (
					<Badge variant="secondary" className={`text-[11px] px-1.5 py-0 border-0 ${colors[status] ?? ""}`}>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</Badge>
				)
			},
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
			key: "actions",
			header: "",
			cell: (row) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={async (e) => {
							e.stopPropagation()
							try {
								await toggleDiscount(row.id, !row.isActive)
								toast.success(row.isActive ? "Deactivated" : "Activated")
								router.refresh()
							} catch {
								toast.error("Failed to update")
							}
						}}
					>
						{row.isActive ? "Deactivate" : "Activate"}
					</Button>
				</div>
			),
		},
	]

	const handleCreate = async () => {
		if (!name.trim() || !value.trim()) return
		setLoading(true)
		try {
			await createDiscount({
				name: name.trim(),
				code: code.trim().toUpperCase() || undefined,
				valueType,
				value: value.trim(),
				minimumOrderAmount: minOrder.trim() || undefined,
				maxUses: maxUses ? parseInt(maxUses) : undefined,
				expiresAt: expiresAt || undefined,
			})
			toast.success("Discount created")
			setCreateOpen(false)
			setName("")
			setCode("")
			setValueType("percentage")
			setValue("")
			setMinOrder("")
			setMaxUses("")
			setExpiresAt("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to create discount")
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={filtered}
				searchPlaceholder="Search discounts..."
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				getId={(row) => row.id}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				onRowClick={(row) => router.push(`/marketing/${row.id}`)}
				emptyMessage="No discounts"
				emptyDescription="Create a discount code to offer promotions."
				totalCount={totalCount}
				currentPage={params.page}
				onPageChange={(page) => setParams({ page })}
				filters={
					<>
						<Select value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive" | "expired")}>
							<SelectTrigger className="h-9 w-full sm:w-[160px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
								<SelectItem value="expired">Expired</SelectItem>
							</SelectContent>
						</Select>
						<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setCreateOpen(true)}>Create Discount</Button>
					</>
				}
			/>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Discount</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Sale 20%" />
						</div>
						<div>
							<Label>Code</Label>
							<Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SUMMER20" className="font-mono" />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Type</Label>
								<Select value={valueType} onValueChange={setValueType}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="percentage">Percentage</SelectItem>
										<SelectItem value="fixed">Fixed Amount</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Value</Label>
								<Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={valueType === "percentage" ? "20" : "10.00"} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Min Order ($)</Label>
								<Input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Optional" />
							</div>
							<div>
								<Label>Max Uses</Label>
								<Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
							</div>
						</div>
						<div>
							<Label>Expires</Label>
							<Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreate} disabled={loading || !name.trim() || !value.trim()}>Create</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
