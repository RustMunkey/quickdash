"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import { usePusher } from "@/components/pusher-provider"
import { AnimatedNumber } from "@/components/animated-number"
import { cn } from "@/lib/utils"

export interface StatConfig {
  key: string
  label: string
  icon: IconSvgElement
  format?: "currency" | "number" | "percent"
  initialValue: number
  change: number
  // How this stat changes when events occur
  onOrderCreated?: (orderAmount: number) => number // Returns delta
  onSubscriptionCreated?: (amount: number) => number
  onSubscriptionCanceled?: (amount: number) => number
  onCustomerCreated?: () => number
}

interface LiveStatsGridProps {
  stats: StatConfig[]
  columns?: 2 | 3 | 4 | 5 | 6
}

function ChangeIndicator({ change, showVsPrev = false }: { change: number; showVsPrev?: boolean }) {
  if (change === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const isUp = change > 0
  return (
    <span className={`text-xs ${isUp ? "text-stat-up" : "text-stat-down"}`}>
      {isUp ? "+" : ""}{change}%{showVsPrev ? " vs prev period" : ""}
    </span>
  )
}

export function LiveStatsGrid({ stats: initialStats, columns = 4 }: LiveStatsGridProps) {
  const { pusher, isConnected, workspaceId } = usePusher()
  const [stats, setStats] = useState(initialStats)
  const initialRef = useRef(initialStats)
  const statsConfigRef = useRef(initialStats)

  // Keep config ref updated
  useEffect(() => {
    statsConfigRef.current = initialStats
  }, [initialStats])

  // Update when server data changes
  useEffect(() => {
    if (JSON.stringify(initialStats) !== JSON.stringify(initialRef.current)) {
      setStats(initialStats)
      initialRef.current = initialStats
    }
  }, [initialStats])

  const handleOrderCreated = useCallback((data: { total?: string; amount?: number }) => {
    const amount = data.total ? parseFloat(data.total) : (data.amount || 0) / 100
    setStats((prev) =>
      prev.map((stat) => {
        const delta = stat.onOrderCreated?.(amount)
        if (delta === undefined) return stat
        return { ...stat, initialValue: stat.initialValue + delta }
      })
    )
  }, [])

  const handleSubscriptionCreated = useCallback((data: { amount?: number }) => {
    const amount = (data.amount || 0) / 100
    setStats((prev) =>
      prev.map((stat) => {
        const delta = stat.onSubscriptionCreated?.(amount)
        if (delta === undefined) return stat
        return { ...stat, initialValue: stat.initialValue + delta }
      })
    )
  }, [])

  const handleSubscriptionCanceled = useCallback((data: { amount?: number }) => {
    const amount = (data.amount || 0) / 100
    setStats((prev) =>
      prev.map((stat) => {
        const delta = stat.onSubscriptionCanceled?.(amount)
        if (delta === undefined) return stat
        return { ...stat, initialValue: Math.max(0, stat.initialValue + delta) }
      })
    )
  }, [])

  const handleCustomerCreated = useCallback(() => {
    setStats((prev) =>
      prev.map((stat) => {
        const delta = stat.onCustomerCreated?.()
        if (delta === undefined) return stat
        return { ...stat, initialValue: stat.initialValue + delta }
      })
    )
  }, [])

  useEffect(() => {
    if (!pusher || !isConnected || !workspaceId) return

    const channelName = `private-workspace-${workspaceId}-orders`
    const ordersChannel = pusher.subscribe(channelName)

    ordersChannel.bind("order:created", handleOrderCreated)
    ordersChannel.bind("subscription:created", handleSubscriptionCreated)
    ordersChannel.bind("subscription:canceled", handleSubscriptionCanceled)

    // Could add more channels for customers, etc.

    return () => {
      ordersChannel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [pusher, isConnected, workspaceId, handleOrderCreated, handleSubscriptionCreated, handleSubscriptionCanceled])

  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
    6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {stats.map((stat) => (
        <div key={stat.key} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <HugeiconsIcon icon={stat.icon} size={16} className="text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              <AnimatedNumber value={stat.initialValue} format={stat.format} />
            </p>
            <ChangeIndicator change={stat.change} />
          </div>
        </div>
      ))}
    </div>
  )
}
