// Revalidate every 60s
export const revalidate = 60

import { HugeiconsIcon } from "@hugeicons/react"
import {
  UserGroupIcon,
  ViewIcon,
  Timer01Icon,
  LogoutCircle01Icon,
} from "@hugeicons/core-free-icons"
import { TrafficHeatmap } from "./traffic-heatmap"
import { VisitorsChart } from "./traffic-charts"
import {
  getPageViews,
  getUniqueVisitors,
  getBounceRate,
  getAvgSessionDuration,
  getHeatmapData,
  getVisitorsOverTime,
  getTrafficSources,
} from "@/lib/analytics"

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
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

export default async function TrafficPage() {
  const range = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  }

  const [pageViews, visitors, bounceRate, avgSession, heatmapData, visitorsOverTime, trafficSources] =
    await Promise.all([
      getPageViews(range),
      getUniqueVisitors(range),
      getBounceRate(range),
      getAvgSessionDuration(range),
      getHeatmapData(),
      getVisitorsOverTime(range),
      getTrafficSources(range),
    ])

  const stats = [
    { label: "Page Views", icon: ViewIcon, value: pageViews.value.toLocaleString(), change: pageViews.change },
    { label: "Unique Visitors", icon: UserGroupIcon, value: visitors.value.toLocaleString(), change: visitors.change },
    { label: "Bounce Rate", icon: LogoutCircle01Icon, value: `${bounceRate.value}%`, change: bounceRate.change },
    { label: "Avg Session", icon: Timer01Icon, value: formatDuration(avgSession.value), change: avgSession.change },
  ]

  const visitorsData = visitorsOverTime.map((p) => ({ date: p.date, visitors: p.value }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Visitor activity and traffic sources.
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

      {/* Heatmap */}
      <TrafficHeatmap data={heatmapData} />

      {/* Visitors Chart + Traffic Sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <VisitorsChart data={visitorsData} />

        <div className="rounded-xl border bg-card p-4 min-w-0 overflow-hidden">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Traffic Sources</h3>
            <p className="text-xs text-muted-foreground">Where your visitors come from</p>
          </div>
          {trafficSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No source data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trafficSources.map((source, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{source.source}</span>
                    <span className="text-muted-foreground">{source.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${source.percentage}%` }}
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
