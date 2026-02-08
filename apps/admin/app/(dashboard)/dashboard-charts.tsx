"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useAccentTheme } from "@/components/accent-theme-provider"
import { useLiveChartData, type ChartDataPoint } from "@/hooks/use-live-chart-data"

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function formatDateTick(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface RevenueChartProps {
  data: ChartDataPoint[]
  live?: boolean
}

export function RevenueChart({ data: initialData, live = true }: RevenueChartProps) {
  const { accentTheme } = useAccentTheme()
  const { data } = useLiveChartData({ initialData })

  // Use live data if enabled, otherwise use initial data
  const chartData = live ? data : initialData

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No revenue data yet</p>
      </div>
    )
  }

  return (
    <ChartContainer key={accentTheme} config={chartConfig} className="h-[280px] sm:h-[250px] w-full">
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 4, left: -8 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
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
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={(value) => `$${value}`}
          fontSize={12}
          width={45}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ChartContainer>
  )
}
