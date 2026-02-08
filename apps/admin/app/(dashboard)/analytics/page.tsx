// Revalidate every 60s - Pusher handles real-time updates on top
export const revalidate = 60

import { AnalyticsCharts } from "./analytics-charts"
import { AnalyticsStats } from "./analytics-stats"
import {
  getRevenueStats,
  getOrderCount,
  getAvgOrderValue,
  getNewCustomers,
  getRevenueOverTime,
  getOrdersOverTime,
  getRevenueByCategory,
} from "@/lib/analytics"

export default async function AnalyticsOverviewPage() {
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [revenue, orders, avgOrder, newCustomers, revenueOverTime, ordersOverTime, categoryBreakdown] =
    await Promise.all([
      getRevenueStats(range),
      getOrderCount(range),
      getAvgOrderValue(range),
      getNewCustomers(range),
      getRevenueOverTime(range),
      getOrdersOverTime(range),
      getRevenueByCategory(range),
    ])

  const revenueData = revenueOverTime.map((p) => ({ date: p.date, revenue: p.value }))
  const ordersData = ordersOverTime.map((p) => ({ date: p.date, orders: p.value }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Store performance for the last 30 days.
      </p>

      {/* KPI Cards - Live updating */}
      <AnalyticsStats
        revenue={revenue}
        orders={orders}
        avgOrder={avgOrder}
        newCustomers={newCustomers}
      />

      {/* Charts */}
      <AnalyticsCharts
        revenueData={revenueData}
        ordersData={ordersData}
        categoryData={categoryBreakdown}
      />
    </div>
  )
}
