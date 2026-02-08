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

type GrowthPoint = { date: string; customers: number }

const growthConfig = {
  customers: { label: "New Customers", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatDateTick(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function CustomerGrowthChart({ data }: { data: GrowthPoint[] }) {
  const { accentTheme } = useAccentTheme()

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 min-w-0 overflow-hidden">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Customer Growth</h3>
          <p className="text-xs text-muted-foreground">New customers over time</p>
        </div>
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 min-w-0 overflow-hidden" key={accentTheme}>
      <div className="mb-4">
        <h3 className="text-sm font-medium">Customer Growth</h3>
        <p className="text-xs text-muted-foreground">New customers over time</p>
      </div>
      <ChartContainer config={growthConfig} className="h-[280px] sm:h-[250px] w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
          <defs>
            <linearGradient id="customerGrowthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-customers)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-customers)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            tickFormatter={formatDateTick}
            fontSize={12}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={12} width={30} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="customers"
            stroke="var(--color-customers)"
            strokeWidth={2}
            fill="url(#customerGrowthGradient)"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
