"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  DollarCircleIcon,
  ShoppingBag01Icon,
  RepeatIcon,
  Invoice02Icon,
} from "@hugeicons/core-free-icons"
import { useLiveStats, type LiveStats } from "@/hooks/use-live-stats"
import { AnimatedNumber } from "@/components/animated-number"

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const isUp = change > 0
  return (
    <span className={`text-xs ${isUp ? "text-stat-up" : "text-stat-down"}`}>
      {isUp ? "+" : ""}{change}%
    </span>
  )
}

interface StatCard {
  label: string
  icon: IconSvgElement
  value: number
  format: "currency" | "number"
  change: number
}

interface DashboardStatsProps {
  initialStats: LiveStats
}

export function DashboardStats({ initialStats }: DashboardStatsProps) {
  const { stats } = useLiveStats({ initialStats })

  const statCards: StatCard[] = [
    {
      label: "Revenue (30d)",
      icon: DollarCircleIcon,
      value: stats.revenue.value,
      format: "currency",
      change: stats.revenue.change,
    },
    {
      label: "Orders (30d)",
      icon: ShoppingBag01Icon,
      value: stats.orderCount.value,
      format: "number",
      change: stats.orderCount.change,
    },
    {
      label: "MRR",
      icon: RepeatIcon,
      value: stats.mrr.value,
      format: "currency",
      change: stats.mrr.change,
    },
    {
      label: "Pending Orders",
      icon: Invoice02Icon,
      value: stats.pendingOrders,
      format: "number",
      change: 0,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <div key={stat.label} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <HugeiconsIcon icon={stat.icon} size={16} className="text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              <AnimatedNumber value={stat.value} format={stat.format} />
            </p>
            <ChangeIndicator change={stat.change} />
          </div>
        </div>
      ))}
    </div>
  )
}
