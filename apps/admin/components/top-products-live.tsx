"use client"

import { useState, useEffect, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

interface TopProduct {
  name: string
  revenue: number
  units: number
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface TopProductsLiveProps {
  initialProducts: TopProduct[]
}

export function TopProductsLive({ initialProducts }: TopProductsLiveProps) {
  const { pusher, isConnected, workspaceId } = usePusher()
  const [products, setProducts] = useState<TopProduct[]>(initialProducts)
  const initialRef = useRef(initialProducts)

  // Update when server data changes
  useEffect(() => {
    if (JSON.stringify(initialProducts) !== JSON.stringify(initialRef.current)) {
      setProducts(initialProducts)
      initialRef.current = initialProducts
    }
  }, [initialProducts])

  // Listen for order events to update product revenue/units
  useEffect(() => {
    if (!pusher || !isConnected || !workspaceId) return

    const channelName = `private-workspace-${workspaceId}-orders`
    const channel = pusher.subscribe(channelName)

    // When a new order comes in with a product, increment its stats
    channel.bind("order:created", (data: { product?: string; amount?: number }) => {
      if (!data.product) return
      const productName = data.product

      setProducts((prev) => {
        const existing = prev.find((p) => p.name === productName)
        if (existing) {
          // Update existing product
          return prev.map((p) =>
            p.name === productName
              ? {
                  ...p,
                  revenue: p.revenue + (data.amount || 0) / 100,
                  units: p.units + 1,
                }
              : p
          ).sort((a, b) => b.revenue - a.revenue)
        }
        // New product - add to list
        return [
          ...prev,
          { name: productName, revenue: (data.amount || 0) / 100, units: 1 },
        ].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      })
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [pusher, isConnected, workspaceId])

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No products yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {products.map((product, i) => (
        <div key={product.name} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
            <span className="text-sm font-medium">{product.name}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium transition-all duration-300">
              {formatCurrency(product.revenue)}
            </p>
            <p className="text-xs text-muted-foreground">{product.units} units</p>
          </div>
        </div>
      ))}
    </div>
  )
}
