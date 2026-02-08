"use client"

import {
  DollarCircleIcon,
  Invoice02Icon,
  Discount01Icon,
  ShoppingCartRemove01Icon,
  DeliveryReturn01Icon,
} from "@hugeicons/core-free-icons"
import { LiveStatsGrid, type StatConfig } from "@/components/live-stats-grid"

interface SalesStatsProps {
  grossSales: { value: number; change: number }
  netRevenue: { value: number; change: number }
  refunds: { count: number }
  discounts: { value: number; change: number }
  cartAbandonment: { rate: number }
}

export function SalesStats({ grossSales, netRevenue, refunds, discounts, cartAbandonment }: SalesStatsProps) {
  const stats: StatConfig[] = [
    {
      key: "grossSales",
      label: "Gross Sales",
      icon: DollarCircleIcon,
      format: "currency",
      initialValue: grossSales.value,
      change: grossSales.change,
      onOrderCreated: (amount) => amount,
    },
    {
      key: "netRevenue",
      label: "Net Revenue",
      icon: Invoice02Icon,
      format: "currency",
      initialValue: netRevenue.value,
      change: netRevenue.change,
      onOrderCreated: (amount) => amount,
    },
    {
      key: "refunds",
      label: "Refunds",
      icon: DeliveryReturn01Icon,
      format: "number",
      initialValue: refunds.count,
      change: 0,
    },
    {
      key: "discounts",
      label: "Discounts Given",
      icon: Discount01Icon,
      format: "currency",
      initialValue: discounts.value,
      change: discounts.change,
    },
    {
      key: "cartAbandonment",
      label: "Cart Abandonment",
      icon: ShoppingCartRemove01Icon,
      format: "percent",
      initialValue: cartAbandonment.rate,
      change: 0,
    },
  ]

  return <LiveStatsGrid stats={stats} columns={5} />
}
