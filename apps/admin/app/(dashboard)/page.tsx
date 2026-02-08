// Revalidate every 60s - Pusher handles real-time updates on top
export const revalidate = 60

import { RevenueChart } from "./dashboard-charts"
import { DashboardStats } from "./dashboard-stats"
import { RecentOrdersLive } from "./recent-orders-live"
import { TopProductsLive } from "@/components/top-products-live"
import {
  getRevenueStats,
  getOrderCount,
  getMRR,
  getRevenueOverTime,
  getRecentOrders,
  getTopProducts,
  getPendingOrdersCount,
} from "@/lib/analytics"

export default async function DashboardPage() {
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [revenue, orderCount, mrr, pendingOrders, revenueOverTime, recentOrders, topProducts] =
    await Promise.all([
      getRevenueStats(range),
      getOrderCount(range),
      getMRR(),
      getPendingOrdersCount(),
      getRevenueOverTime(range),
      getRecentOrders(5),
      getTopProducts(range),
    ])

  const initialStats = {
    revenue: { value: revenue.value, change: revenue.change },
    orderCount: { value: orderCount.value, change: orderCount.change },
    mrr: { value: mrr.value, change: mrr.change },
    pendingOrders,
  }

  const chartData = revenueOverTime.map((p) => ({ date: p.date, revenue: p.value }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Overview of your store performance.
      </p>

      {/* KPI Cards - Live updating */}
      <DashboardStats initialStats={initialStats} />

      {/* Revenue Chart */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Revenue</h3>
          <p className="text-xs text-muted-foreground">Daily revenue over the last 30 days</p>
        </div>
        <RevenueChart data={chartData} />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Orders - Live updating */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Recent Orders</h3>
            <p className="text-xs text-muted-foreground">Latest orders from your store</p>
          </div>
          <RecentOrdersLive initialOrders={recentOrders} />
        </div>

        {/* Top Products - Live updating */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Top Products</h3>
            <p className="text-xs text-muted-foreground">Best sellers this month</p>
          </div>
          <TopProductsLive initialProducts={topProducts} />
        </div>
      </div>
    </div>
  )
}
