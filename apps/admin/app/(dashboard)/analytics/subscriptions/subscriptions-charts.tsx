"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAccentTheme } from "@/components/accent-theme-provider"

type GrowthPoint = { date: string; subscriptions: number }

const growthConfig = {
  subscriptions: { label: "New Subscriptions", color: "var(--chart-1)" },
} satisfies ChartConfig

export function SubscriptionGrowthChart({ data }: { data: GrowthPoint[] }) {
  const { accentTheme } = useAccentTheme()
  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Subscription Growth</h3>
          <p className="text-xs text-muted-foreground">New subscriptions over time</p>
        </div>
        <div className="h-[240px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4" key={accentTheme}>
      <div className="mb-4">
        <h3 className="text-sm font-medium">Subscription Growth</h3>
        <p className="text-xs text-muted-foreground">New subscriptions over time</p>
      </div>
      <ChartContainer config={growthConfig} className="h-[240px] w-full">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="subGrowthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-subscriptions)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-subscriptions)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="subscriptions"
            stroke="var(--color-subscriptions)"
            strokeWidth={2}
            fill="url(#subGrowthGradient)"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
