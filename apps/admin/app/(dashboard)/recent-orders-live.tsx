"use client"

import { useState, useEffect, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"
import { cn } from "@/lib/utils"

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  isNew?: boolean
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  )
}

interface RecentOrdersLiveProps {
  initialOrders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    createdAt: Date
  }>
}

export function RecentOrdersLive({ initialOrders }: RecentOrdersLiveProps) {
  const { pusher, isConnected, workspaceId } = usePusher()
  const [orders, setOrders] = useState<RecentOrder[]>(
    initialOrders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    }))
  )
  const initialRef = useRef(initialOrders)

  // Update when server data changes
  useEffect(() => {
    if (JSON.stringify(initialOrders) !== JSON.stringify(initialRef.current)) {
      setOrders(initialOrders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
      })))
      initialRef.current = initialOrders
    }
  }, [initialOrders])

  useEffect(() => {
    if (!pusher || !isConnected || !workspaceId) return

    const channelName = `private-workspace-${workspaceId}-orders`
    const channel = pusher.subscribe(channelName)

    channel.bind("order:created", (data: RecentOrder) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === data.id)) return prev
        const newOrder = { ...data, isNew: true }
        const updated = [newOrder, ...prev].slice(0, 5) // Keep only 5
        return updated
      })
      // Remove new flag after animation
      setTimeout(() => {
        setOrders((prev) =>
          prev.map((o) => (o.id === data.id ? { ...o, isNew: false } : o))
        )
      }, 2000)
    })

    channel.bind("order:updated", (data: { orderId: string; status: string }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
      )
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [pusher, isConnected, workspaceId])

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No orders yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className={cn(
            "flex items-center justify-between transition-all duration-300",
            order.isNew && "bg-primary/5 -mx-2 px-2 py-1 rounded-lg"
          )}
        >
          <div className="space-y-0.5">
            <p className={cn("text-sm font-medium", order.isNew && "text-primary")}>
              #{order.orderNumber}
              {order.isNew && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  NEW
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("en-US")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
