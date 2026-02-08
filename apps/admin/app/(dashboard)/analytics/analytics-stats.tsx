"use client"

import {
  DollarCircleIcon,
  ShoppingBag01Icon,
  UserGroupIcon,
  CreditCardIcon,
  MouseLeftClick01Icon,
  DeliveryReturn01Icon,
} from "@hugeicons/core-free-icons"
import { LiveStatsGrid, type StatConfig } from "@/components/live-stats-grid"

interface AnalyticsStatsProps {
  revenue: { value: number; change: number }
  orders: { value: number; change: number }
  avgOrder: { value: number; change: number }
  newCustomers: { value: number; change: number }
}

export function AnalyticsStats({ revenue, orders, avgOrder, newCustomers }: AnalyticsStatsProps) {
  const stats: StatConfig[] = [
    {
      key: "revenue",
      label: "Total Revenue",
      icon: DollarCircleIcon,
      format: "currency",
      initialValue: revenue.value,
      change: revenue.change,
      onOrderCreated: (amount) => amount,
    },
    {
      key: "orders",
      label: "Total Orders",
      icon: ShoppingBag01Icon,
      format: "number",
      initialValue: orders.value,
      change: orders.change,
      onOrderCreated: () => 1,
    },
    {
      key: "avgOrder",
      label: "Avg Order Value",
      icon: CreditCardIcon,
      format: "currency",
      initialValue: avgOrder.value,
      change: avgOrder.change,
    },
    {
      key: "newCustomers",
      label: "New Customers",
      icon: UserGroupIcon,
      format: "number",
      initialValue: newCustomers.value,
      change: newCustomers.change,
      onCustomerCreated: () => 1,
    },
    {
      key: "conversionRate",
      label: "Conversion Rate",
      icon: MouseLeftClick01Icon,
      format: "number",
      initialValue: 0,
      change: 0,
    },
    {
      key: "returnRate",
      label: "Return Rate",
      icon: DeliveryReturn01Icon,
      format: "number",
      initialValue: 0,
      change: 0,
    },
  ]

  return <LiveStatsGrid stats={stats} columns={3} />
}
