// Revalidate every 60s
export const revalidate = 60

import { HugeiconsIcon } from "@hugeicons/react"
import {
  UserGroupIcon,
  UserAdd01Icon,
  RepeatIcon,
  DollarCircleIcon,
} from "@hugeicons/core-free-icons"
import { CustomerGrowthChart } from "./customers-charts"
import {
  getTotalCustomers,
  getNewCustomers,
  getRepeatRate,
  getAvgLifetimeValue,
  getCustomerGrowth,
  getTopCustomers,
  getCustomerSegments,
} from "@/lib/analytics"

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) return <span className="text-xs text-muted-foreground">No change</span>
  const isUp = change > 0
  return (
    <span className={`text-xs ${isUp ? "text-stat-up" : "text-stat-down"}`}>
      {isUp ? "+" : ""}{change}%
    </span>
  )
}

export default async function CustomerInsightsPage() {
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [totalCustomers, newCustomers, repeatRate, avgLtv, customerGrowth, topCustomers, segments] =
    await Promise.all([
      getTotalCustomers(),
      getNewCustomers(range),
      getRepeatRate(range),
      getAvgLifetimeValue(),
      getCustomerGrowth(range),
      getTopCustomers(5),
      getCustomerSegments(),
    ])

  const stats = [
    { label: "Total Customers", icon: UserGroupIcon, value: totalCustomers.toLocaleString(), change: 0 },
    { label: "New This Month", icon: UserAdd01Icon, value: newCustomers.value.toLocaleString(), change: newCustomers.change },
    { label: "Repeat Rate", icon: RepeatIcon, value: `${repeatRate.value}%`, change: repeatRate.change },
    { label: "Avg Lifetime Value", icon: DollarCircleIcon, value: formatCurrency(avgLtv.value), change: avgLtv.change },
  ]

  const growthData = customerGrowth.map((p) => ({ date: p.date, customers: p.value }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Customer behavior, segments, and lifetime value.
      </p>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                <HugeiconsIcon icon={stat.icon} size={16} className="text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
              <ChangeIndicator change={stat.change} />
            </div>
          </div>
        ))}
      </div>

      {/* Customer Growth Chart */}
      <CustomerGrowthChart data={growthData} />

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Customers */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Top Customers</h3>
            <p className="text-xs text-muted-foreground">Highest lifetime spend</p>
          </div>
          {topCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No customers yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(customer.spent)}</p>
                    <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Segments */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Customer Segments</h3>
            <p className="text-xs text-muted-foreground">Breakdown by purchase behavior</p>
          </div>
          {segments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No segment data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((segment, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{segment.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{segment.description}</span>
                    </div>
                    <span className="text-muted-foreground">{segment.count} ({segment.percentage}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
