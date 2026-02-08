"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	ShoppingBag01Icon,
	PackageIcon,
	UserMultiple02Icon,
	AlertCircleIcon,
	ArrowUp01Icon,
	ArrowDown01Icon,
	RefreshIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getQuickStats } from "./stats-actions"

type Stats = {
	todaySales: number
	todayOrders: number
	pendingOrders: number
	lowStockItems: number
	newCustomers: number
	salesChange: number
	ordersChange: number
}

function useStats() {
	const [loading, setLoading] = React.useState(true)
	const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
	const [stats, setStats] = React.useState<Stats>({
		todaySales: 0,
		todayOrders: 0,
		pendingOrders: 0,
		lowStockItems: 0,
		newCustomers: 0,
		salesChange: 0,
		ordersChange: 0,
	})

	const refresh = React.useCallback(async () => {
		setLoading(true)
		try {
			const data = await getQuickStats()
			setStats(data)
			setLastUpdated(new Date())
		} catch {
			// Silently fail - widget will show stale data
		} finally {
			setLoading(false)
		}
	}, [])

	// Load on mount
	React.useEffect(() => {
		refresh()
	}, [refresh])

	return { stats, loading, refresh, lastUpdated }
}

function StatCard({
	icon,
	label,
	value,
	change,
	alert,
}: {
	icon: typeof ShoppingBag01Icon
	label: string
	value: string | number
	change?: number
	alert?: boolean
}) {
	return (
		<div className={cn(
			"p-3 rounded-lg border",
			alert && "border-destructive/50 bg-destructive/5"
		)}>
			<div className="flex items-start justify-between mb-2">
				<HugeiconsIcon
					icon={icon}
					size={16}
					className={alert ? "text-destructive" : "text-muted-foreground"}
				/>
				{change !== undefined && (
					<div className={cn(
						"flex items-center gap-0.5 text-xs",
						change >= 0 ? "text-green-500" : "text-red-500"
					)}>
						<HugeiconsIcon
							icon={change >= 0 ? ArrowUp01Icon : ArrowDown01Icon}
							size={12}
						/>
						{Math.abs(change).toFixed(1)}%
					</div>
				)}
			</div>
			<div className="text-lg font-semibold">{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	)
}

export function StatsWidget() {
	const { stats, loading, refresh, lastUpdated } = useStats()

	return (
		<div className="p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div className="text-xs font-medium text-muted-foreground">Today's Overview</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={refresh}
					disabled={loading}
				>
					<HugeiconsIcon
						icon={RefreshIcon}
						size={14}
						className={loading ? "animate-spin" : ""}
					/>
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<StatCard
					icon={ShoppingBag01Icon}
					label="Sales"
					value={`$${stats.todaySales.toFixed(2)}`}
					change={stats.salesChange}
				/>
				<StatCard
					icon={PackageIcon}
					label="Orders"
					value={stats.todayOrders}
					change={stats.ordersChange}
				/>
				<StatCard
					icon={PackageIcon}
					label="Pending"
					value={stats.pendingOrders}
					alert={stats.pendingOrders > 0}
				/>
				<StatCard
					icon={AlertCircleIcon}
					label="Low Stock"
					value={stats.lowStockItems}
					alert={stats.lowStockItems > 0}
				/>
				<StatCard
					icon={UserMultiple02Icon}
					label="New Customers"
					value={stats.newCustomers}
				/>
			</div>

			<div className="text-[10px] text-muted-foreground text-center">
				{lastUpdated
					? `Last updated: ${lastUpdated.toLocaleTimeString()}`
					: "Loading..."}
			</div>
		</div>
	)
}
