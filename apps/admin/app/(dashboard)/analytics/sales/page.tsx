// Revalidate every 60s - Pusher handles real-time updates on top
export const revalidate = 60

import { SalesCharts } from "./sales-charts"
import { SalesStats } from "./sales-stats"
import { TopProductsLive } from "@/components/top-products-live"
import {
  getGrossSales,
  getRevenueStats,
  getDiscountsGiven,
  getSalesByDay,
  getTopProducts,
} from "@/lib/analytics"
import { getRefunds, getCartAbandonment, getSkuMargins } from "@/lib/analytics"

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function SalesReportsPage() {
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [grossSales, netRevenue, discounts, salesByDay, topProducts, refunds, cartAbandonment, skuMargins] =
    await Promise.all([
      getGrossSales(range),
      getRevenueStats(range),
      getDiscountsGiven(range),
      getSalesByDay(range),
      getTopProducts(range),
      getRefunds(range),
      getCartAbandonment(range),
      getSkuMargins(range, 10),
    ])

  const salesData = salesByDay.map((p) => ({ date: p.date, sales: p.value }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Detailed sales breakdown and product performance.
      </p>

      {/* KPI Cards - Live updating */}
      <SalesStats
        grossSales={grossSales}
        netRevenue={netRevenue}
        refunds={refunds}
        discounts={discounts}
        cartAbandonment={cartAbandonment}
      />

      {/* Sales by Day Chart */}
      <SalesCharts salesByDay={salesData} />

      {/* Middle Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Products - Live updating */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Top Products</h3>
            <p className="text-xs text-muted-foreground">Best sellers by revenue</p>
          </div>
          <TopProductsLive initialProducts={topProducts} />
        </div>

        {/* Cart Abandonment Details */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Checkout Funnel</h3>
            <p className="text-xs text-muted-foreground">Cart to purchase conversion</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Started checkout</span>
              <span className="text-sm font-medium">{cartAbandonment.abandonedCarts + cartAbandonment.completedCarts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed purchase</span>
              <span className="text-sm font-medium text-stat-up">{cartAbandonment.completedCarts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Abandoned</span>
              <span className="text-sm font-medium text-stat-down">{cartAbandonment.abandonedCarts}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${cartAbandonment.completedCarts > 0 ? 100 - cartAbandonment.rate : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {(100 - cartAbandonment.rate).toFixed(1)}% checkout completion rate
            </p>
          </div>
        </div>
      </div>

      {/* SKU Margins */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Product Margins</h3>
          <p className="text-xs text-muted-foreground">Profitability by SKU</p>
        </div>
        {skuMargins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No margin data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Product</th>
                  <th className="text-right py-2 px-2 font-medium">Units</th>
                  <th className="text-right py-2 px-2 font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 font-medium">Cost</th>
                  <th className="text-right py-2 px-2 font-medium">Margin</th>
                  <th className="text-right py-2 pl-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {skuMargins.map((sku, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{sku.productName}</p>
                      <p className="text-xs text-muted-foreground">{sku.sku}</p>
                    </td>
                    <td className="text-right py-2 px-2">{sku.unitsSold}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sku.revenue)}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(sku.cost)}</td>
                    <td className="text-right py-2 px-2 font-medium">{formatCurrency(sku.margin)}</td>
                    <td className={`text-right py-2 pl-2 font-medium ${sku.marginPct >= 50 ? "text-stat-up" : sku.marginPct < 20 ? "text-stat-down" : ""}`}>
                      {sku.marginPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
