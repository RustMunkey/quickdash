"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/status-badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"

interface CustomerDetailProps {
	customer: {
		id: string
		name: string
		email: string
		image: string | null
		phone: string | null
		walletAddress: string | null
		createdAt: Date
		orders: Array<{
			id: string
			orderNumber: string
			status: string
			total: string
			createdAt: Date
		}>
		segments: Array<{
			id: string
			name: string
			color: string | null
		}>
		loyalty: {
			points: number
			lifetimePoints: number
			tier: string | null
		} | null
		orderCount: number
		totalSpent: number
	}
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
	useBreadcrumbOverride(customer.id, customer.name)
	const router = useRouter()

	return (
		<>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
						{customer.image ? (
							<img src={customer.image} alt="" className="w-full h-full object-cover" />
						) : (
							<span className="text-sm font-medium text-muted-foreground">
								{customer.name.charAt(0).toUpperCase()}
							</span>
						)}
					</div>
					<div>
						<h2 className="text-lg font-semibold">{customer.name}</h2>
						<p className="text-sm text-muted-foreground">{customer.email}</p>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{customer.loyalty?.tier && (
						<Badge variant="default" className="text-[10px]">
							{customer.loyalty.tier}
						</Badge>
					)}
					{customer.segments.map((seg) => (
						<Badge key={seg.id} variant="secondary" className="text-[10px]">
							{seg.name}
						</Badge>
					))}
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-3 grid-cols-2 md:grid-cols-4">
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Orders</p>
					<p className="text-xl font-semibold">{customer.orderCount}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Total Spent</p>
					<p className="text-xl font-semibold">{formatCurrency(customer.totalSpent)}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Points</p>
					<p className="text-xl font-semibold">{customer.loyalty?.points?.toLocaleString() ?? 0}</p>
				</div>
				<div className="rounded-lg border px-4 py-3">
					<p className="text-xs text-muted-foreground">Member Since</p>
					<p className="text-sm font-medium mt-0.5">{formatDate(customer.createdAt)}</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{/* Main content - orders */}
				<div className="md:col-span-2 space-y-4">
					<div className="rounded-lg border">
						<div className="px-4 py-3 border-b">
							<h3 className="text-sm font-medium">Orders ({customer.orders.length})</h3>
						</div>
						{customer.orders.length === 0 ? (
							<div className="px-4 py-8 text-center">
								<p className="text-sm text-muted-foreground">No orders yet</p>
							</div>
						) : (
							<div className="divide-y">
								{customer.orders.map((order) => (
									<div
										key={order.id}
										className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer"
										onClick={() => router.push(`/orders/${order.id}`)}
									>
										<div className="flex items-center gap-3">
											<span className="text-sm font-medium">#{order.orderNumber}</span>
											<StatusBadge status={order.status} type="order" />
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm">{formatCurrency(order.total)}</span>
											<span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(order.createdAt)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Contact</h3>
						<div className="text-xs text-muted-foreground space-y-1.5">
							<p>{customer.email}</p>
							<p>{customer.phone || "No phone"}</p>
							{customer.walletAddress && (
								<p className="font-mono truncate">{customer.walletAddress}</p>
							)}
						</div>
					</div>

					{customer.segments.length > 0 && (
						<div className="rounded-lg border px-4 py-3">
							<h3 className="text-sm font-medium mb-2">Segments</h3>
							<div className="flex flex-wrap gap-1.5">
								{customer.segments.map((seg) => (
									<div key={seg.id} className="flex items-center gap-1.5">
										<div
											className="w-2.5 h-2.5 rounded-full shrink-0"
											style={{ backgroundColor: seg.color || "#888" }}
										/>
										<span className="text-xs text-muted-foreground">{seg.name}</span>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="rounded-lg border px-4 py-3">
						<h3 className="text-sm font-medium mb-2">Loyalty</h3>
						<div className="text-xs text-muted-foreground space-y-1.5">
							<div className="flex justify-between">
								<span>Points</span>
								<span className="font-medium text-foreground">{customer.loyalty?.points?.toLocaleString() ?? 0}</span>
							</div>
							<div className="flex justify-between">
								<span>Lifetime</span>
								<span>{customer.loyalty?.lifetimePoints?.toLocaleString() ?? 0}</span>
							</div>
							<div className="flex justify-between">
								<span>Tier</span>
								<span>{customer.loyalty?.tier ?? "None"}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
