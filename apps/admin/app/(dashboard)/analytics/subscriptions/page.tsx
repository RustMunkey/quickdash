// Revalidate every 60s
export const revalidate = 60

import { HugeiconsIcon } from "@hugeicons/react"
import {
  RepeatIcon,
  DollarCircleIcon,
  UserRemove01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"
import { SubscriptionGrowthChart } from "./subscriptions-charts"
import { requireWorkspace } from "@/lib/workspace"
import {
  getActiveSubscriptions,
  getMRR,
  getChurnRate,
  getNewSubscriptions,
  getSubscriptionGrowth,
  getRevenueSplit,
  getSubscriptionsByFrequency,
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

export default async function SubscriptionAnalyticsPage() {
  const workspace = await requireWorkspace()
  const wid = workspace.id
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [activeSubs, mrr, churnRate, newSubs, subGrowth, revenueSplit, byFrequency] =
    await Promise.all([
      getActiveSubscriptions(wid),
      getMRR(wid),
      getChurnRate(range, wid),
      getNewSubscriptions(range, wid),
      getSubscriptionGrowth(range, wid),
      getRevenueSplit(range, wid),
      getSubscriptionsByFrequency(wid),
    ])

  const stats = [
    { label: "Active Subscriptions", icon: RepeatIcon, value: activeSubs.toLocaleString(), change: 0 },
    { label: "MRR", icon: DollarCircleIcon, value: formatCurrency(mrr.value), change: mrr.change },
    { label: "New This Month", icon: UserAdd01Icon, value: newSubs.value.toLocaleString(), change: newSubs.change },
    { label: "Churn Rate", icon: UserRemove01Icon, value: `${churnRate.value}%`, change: churnRate.change },
  ]

  const growthData = subGrowth.map((p) => ({ date: p.date, subscriptions: p.value }))
  const totalFrequency = byFrequency.reduce((acc, f) => acc + f.count, 0) || 1

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Recurring revenue, growth, and retention metrics.
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

      {/* Subscription Growth Chart */}
      <SubscriptionGrowthChart data={growthData} />

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Split */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Revenue Split</h3>
            <p className="text-xs text-muted-foreground">Subscription vs one-time purchases</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Subscription</span>
                <span className="text-muted-foreground">{formatCurrency(revenueSplit.subscription)} ({revenueSplit.subscriptionPct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${revenueSplit.subscriptionPct}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">One-time</span>
                <span className="text-muted-foreground">{formatCurrency(revenueSplit.oneTime)} ({(100 - revenueSplit.subscriptionPct).toFixed(1)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${100 - revenueSplit.subscriptionPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* By Frequency */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">By Frequency</h3>
            <p className="text-xs text-muted-foreground">Active subscriptions by delivery schedule</p>
          </div>
          {byFrequency.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No subscriptions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {byFrequency.map((freq, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{freq.frequency}</span>
                    <span className="text-muted-foreground">{freq.count} ({Math.round((freq.count / totalFrequency) * 100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(freq.count / totalFrequency) * 100}%` }}
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
