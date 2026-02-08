"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { toast } from "sonner"
import { deactivateGiftCard } from "../actions"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"

interface GiftCardDetailProps {
	card: {
		id: string
		code: string
		initialBalance: string
		currentBalance: string
		issuedTo: string | null
		issuedBy: string
		status: string
		expiresAt: Date | null
		createdAt: Date
		transactions: Array<{
			id: string
			type: string
			amount: string
			orderId: string | null
			createdAt: Date
		}>
		issuedToUser: { name: string; email: string } | null
		issuedByUser: { name: string; email: string } | null
	}
}

export function GiftCardDetail({ card }: GiftCardDetailProps) {
	const router = useRouter()
	useBreadcrumbOverride(card.id, card.code)

	async function handleDeactivate() {
		if (!confirm("Deactivate this gift card? It will no longer be usable.")) return
		try {
			await deactivateGiftCard(card.id)
			toast.success("Gift card deactivated")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to deactivate")
		}
	}

	return (
		<>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold font-mono break-all">{card.code}</h2>
					<StatusBadge status={card.status} type="giftCard" />
				</div>
				{card.status === "active" && (
					<Button
						variant="destructive"
						size="sm"
						onClick={handleDeactivate}
					>
						Deactivate
					</Button>
				)}
			</div>

			{/* Info */}
			<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Current Balance</p>
					<p className="text-xl font-semibold">{formatCurrency(card.currentBalance)}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Initial Balance</p>
					<p className="text-xl font-semibold">{formatCurrency(card.initialBalance)}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Created</p>
					<p className="text-sm font-medium">{formatDate(card.createdAt)}</p>
					{card.expiresAt && (
						<p className="text-xs text-muted-foreground mt-1">
							Expires: {formatDate(card.expiresAt)}
						</p>
					)}
				</div>
			</div>

			{/* Issue details */}
			<div className="rounded-lg border px-4 py-4 space-y-3 max-w-md">
				<div>
					<p className="text-xs text-muted-foreground">Issued By</p>
					<p className="text-sm">
						{card.issuedByUser ? `${card.issuedByUser.name} (${card.issuedByUser.email})` : card.issuedBy}
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Issued To</p>
					<p className="text-sm">
						{card.issuedToUser
							? `${card.issuedToUser.name} (${card.issuedToUser.email})`
							: card.issuedTo || "—"}
					</p>
				</div>
			</div>

			{/* Transactions */}
			<div>
				<h3 className="text-sm font-medium mb-3">
					Transactions ({card.transactions.length})
				</h3>
				{card.transactions.length === 0 ? (
					<div className="rounded-lg border px-4 py-8 text-center">
						<p className="text-sm text-muted-foreground">No transactions</p>
					</div>
				) : (
					<div className="rounded-lg border divide-y">
						{card.transactions.map((tx) => (
							<div key={tx.id} className="flex items-center justify-between px-4 py-3">
								<div className="flex items-center gap-3">
									<Badge variant="secondary" className="text-[10px]">
										{tx.type}
									</Badge>
									{tx.orderId && (
										<span className="text-xs text-muted-foreground">
											Order: {tx.orderId.slice(0, 8)}...
										</span>
									)}
								</div>
								<div className="flex items-center gap-3">
									<span className={`text-sm font-medium ${
										tx.type === "redeemed" ? "text-red-600" : "text-green-600"
									}`}>
										{tx.type === "redeemed" ? "-" : "+"}
										{formatCurrency(tx.amount)}
									</span>
									<span className="text-xs text-muted-foreground">
										{formatDate(tx.createdAt)}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	)
}
