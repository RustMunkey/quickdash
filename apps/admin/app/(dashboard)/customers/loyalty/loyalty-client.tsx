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
import { updateLoyaltyConfig, adjustPoints, bulkDeleteLoyaltyHolders, bulkDeleteLoyaltyTransactions } from "./actions"
import { formatDate } from "@/lib/format"

interface LoyaltyConfig {
	id: string
	pointsPerDollar: number
	pointsRedemptionRate: string
	tiers: Array<{ name: string; minPoints: number; perks: string[] }> | null
	isActive: boolean | null
	updatedAt: Date
}

interface Holder {
	userId: string
	points: number
	lifetimePoints: number
	tier: string | null
	userName: string
	userEmail: string
}

interface Transaction {
	id: string
	userId: string
	type: string
	points: number
	description: string | null
	createdAt: Date
	userName: string
	userEmail: string
}

interface LoyaltyClientProps {
	config: LoyaltyConfig | null
	holders: Holder[]
	holdersTotalCount: number
	holdersCurrentPage: number
	transactions: Transaction[]
	transactionsTotalCount: number
	transactionsCurrentPage: number
}

export function LoyaltyClient({ config, holders, holdersTotalCount, holdersCurrentPage, transactions, transactionsTotalCount, transactionsCurrentPage }: LoyaltyClientProps) {
	const router = useRouter()
	const [view, setView] = useState("holders")

	// Config dialog state
	const [configOpen, setConfigOpen] = useState(false)
	const [pointsPerDollar, setPointsPerDollar] = useState(config?.pointsPerDollar ?? 10)
	const [redemptionRate, setRedemptionRate] = useState(config?.pointsRedemptionRate ?? "0.01")
	const [isActive, setIsActive] = useState(config?.isActive ?? true)
	const [saving, setSaving] = useState(false)

	// Adjust dialog state
	const [adjustOpen, setAdjustOpen] = useState(false)
	const [adjustUserId, setAdjustUserId] = useState("")
	const [adjustAmount, setAdjustAmount] = useState("")
	const [adjustReason, setAdjustReason] = useState("")

	// Selection state
	const [selectedHolderIds, setSelectedHolderIds] = useState<string[]>([])
	const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	async function handleSaveConfig() {
		setSaving(true)
		try {
			await updateLoyaltyConfig({
				pointsPerDollar,
				pointsRedemptionRate: redemptionRate,
				tiers: config?.tiers ?? [],
				isActive,
			})
			toast.success("Configuration saved")
			setConfigOpen(false)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save")
		} finally {
			setSaving(false)
		}
	}

	async function handleAdjust() {
		if (!adjustUserId.trim() || !adjustAmount || !adjustReason.trim()) {
			toast.error("All fields are required")
			return
		}
		try {
			await adjustPoints(adjustUserId.trim(), parseInt(adjustAmount), adjustReason.trim())
			toast.success("Points adjusted")
			setAdjustOpen(false)
			setAdjustUserId("")
			setAdjustAmount("")
			setAdjustReason("")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to adjust points")
		}
	}

	async function handleBulkDeleteHolders() {
		if (selectedHolderIds.length === 0) return
		setLoading(true)
		try {
			await bulkDeleteLoyaltyHolders(selectedHolderIds)
			setSelectedHolderIds([])
			router.refresh()
			toast.success(`Removed ${selectedHolderIds.length} holder(s)`)
		} catch {
			toast.error("Failed to remove holders")
		} finally {
			setLoading(false)
		}
	}

	async function handleBulkDeleteTransactions() {
		if (selectedTransactionIds.length === 0) return
		setLoading(true)
		try {
			await bulkDeleteLoyaltyTransactions(selectedTransactionIds)
			setSelectedTransactionIds([])
			router.refresh()
			toast.success(`Deleted ${selectedTransactionIds.length} transaction(s)`)
		} catch {
			toast.error("Failed to delete transactions")
		} finally {
			setLoading(false)
		}
	}

	const holderColumns: Column<Holder>[] = [
		{
			key: "name",
			header: "Customer",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.userName}</span>
					<p className="text-xs text-muted-foreground">{row.userEmail}</p>
				</div>
			),
		},
		{
			key: "tier",
			header: "Tier",
			cell: (row) => row.tier ? (
				<Badge variant="secondary" className="text-[10px]">{row.tier}</Badge>
			) : <span className="text-xs text-muted-foreground">—</span>,
		},
		{
			key: "points",
			header: "Points",
			cell: (row) => <span className="text-sm font-medium">{row.points.toLocaleString()}</span>,
		},
		{
			key: "lifetime",
			header: "Lifetime",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{row.lifetimePoints.toLocaleString()}</span>
			),
		},
	]

	const transactionColumns: Column<Transaction>[] = [
		{
			key: "user",
			header: "Customer",
			cell: (row) => <span className="text-sm">{row.userName}</span>,
		},
		{
			key: "type",
			header: "Type",
			cell: (row) => (
				<Badge variant={row.points > 0 ? "default" : "secondary"} className="text-[10px]">
					{row.type}
				</Badge>
			),
		},
		{
			key: "points",
			header: "Points",
			cell: (row) => (
				<span className={`text-sm font-medium ${row.points > 0 ? "text-green-600" : "text-red-600"}`}>
					{row.points > 0 ? "+" : ""}{row.points}
				</span>
			),
		},
		{
			key: "description",
			header: "Description",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{row.description || "—"}</span>
			),
		},
		{
			key: "date",
			header: "Date",
			cell: (row) => (
				<span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
			),
		},
	]

	return (
		<>
			<div className="flex items-center gap-3 rounded-lg border px-4 py-3">
				<div className="flex-1 flex items-center gap-4 sm:gap-6 text-sm flex-wrap">
					<div>
						<span className="text-muted-foreground">Status: </span>
						<Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
							{isActive ? "Active" : "Inactive"}
						</Badge>
					</div>
					<div>
						<span className="text-muted-foreground">Points/Dollar: </span>
						<span className="font-medium">{config?.pointsPerDollar ?? 10}</span>
					</div>
					<div className="hidden sm:block">
						<span className="text-muted-foreground">Redemption: </span>
						<span className="font-medium">${config?.pointsRedemptionRate ?? "0.01"}/pt</span>
					</div>
				</div>
				<Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
					Edit
				</Button>
			</div>

			{view === "holders" ? (
				<DataTable
					columns={holderColumns}
					data={holders}
					searchPlaceholder="Search holders..."
					totalCount={holdersTotalCount}
					currentPage={holdersCurrentPage}
					pageSize={25}
					getId={(row) => row.userId}
					selectable
					selectedIds={selectedHolderIds}
					onSelectionChange={setSelectedHolderIds}
					bulkActions={
						<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDeleteHolders}>
							Remove ({selectedHolderIds.length})
						</Button>
					}
					emptyMessage="No loyalty members yet"
					emptyDescription="Customers earn points when they make purchases."
					filters={
						<>
							<Select value={view} onValueChange={setView}>
								<SelectTrigger className="h-9 w-full sm:w-[160px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="holders">Top Holders</SelectItem>
									<SelectItem value="transactions">Transactions</SelectItem>
								</SelectContent>
							</Select>
							<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setAdjustOpen(true)}>Adjust Points</Button>
						</>
					}
				/>
			) : (
				<DataTable
					columns={transactionColumns}
					data={transactions}
					searchPlaceholder="Search transactions..."
					totalCount={transactionsTotalCount}
					currentPage={transactionsCurrentPage}
					pageSize={25}
					getId={(row) => row.id}
					selectable
					selectedIds={selectedTransactionIds}
					onSelectionChange={setSelectedTransactionIds}
					bulkActions={
						<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDeleteTransactions}>
							Delete ({selectedTransactionIds.length})
						</Button>
					}
					emptyMessage="No transactions yet"
					emptyDescription="Points transactions will appear here."
					filters={
						<>
							<Select value={view} onValueChange={setView}>
								<SelectTrigger className="h-9 w-full sm:w-[160px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="holders">Top Holders</SelectItem>
									<SelectItem value="transactions">Transactions</SelectItem>
								</SelectContent>
							</Select>
							<Button size="sm" className="h-9 hidden sm:flex" onClick={() => setAdjustOpen(true)}>Adjust Points</Button>
						</>
					}
				/>
			)}

			<Dialog open={configOpen} onOpenChange={setConfigOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Configuration</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="flex items-center justify-between">
							<Label>Program Active</Label>
							<Button
								size="sm"
								variant={isActive ? "default" : "outline"}
								onClick={() => setIsActive(!isActive)}
							>
								{isActive ? "Active" : "Inactive"}
							</Button>
						</div>
						<div className="space-y-1.5">
							<Label>Points Per Dollar</Label>
							<Input
								type="number"
								value={pointsPerDollar}
								onChange={(e) => setPointsPerDollar(parseInt(e.target.value) || 0)}
							/>
							<p className="text-xs text-muted-foreground">
								How many points customers earn per $1 spent.
							</p>
						</div>
						<div className="space-y-1.5">
							<Label>Redemption Rate ($ per point)</Label>
							<Input
								value={redemptionRate}
								onChange={(e) => setRedemptionRate(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Dollar value of each point when redeemed. e.g. 0.01 = 1 cent per point.
							</p>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setConfigOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleSaveConfig} disabled={saving}>
								{saving ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Manual Points Adjustment</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>User ID</Label>
							<Input
								value={adjustUserId}
								onChange={(e) => setAdjustUserId(e.target.value)}
								placeholder="Enter user ID"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Points (+/-)</Label>
							<Input
								type="number"
								value={adjustAmount}
								onChange={(e) => setAdjustAmount(e.target.value)}
								placeholder="e.g. 100 or -50"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Reason</Label>
							<Input
								value={adjustReason}
								onChange={(e) => setAdjustReason(e.target.value)}
								placeholder="e.g. Customer service credit"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setAdjustOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleAdjust}>Adjust</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
