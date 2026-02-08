"use client"

import { useState, useRef } from "react"

type HeatmapDay = { date: string; value: number }

const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""]
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getHeatmapLevel(value: number, max: number): number {
  if (max === 0 || value === 0) return 0
  const ratio = value / max
  if (ratio < 0.2) return 1
  if (ratio < 0.4) return 2
  if (ratio < 0.6) return 3
  if (ratio < 0.8) return 4
  return 5
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const day = weekdayNames[date.getDay()]
  const month = monthLabels[date.getMonth()]
  const num = date.getDate()
  return `${day}, ${month} ${num}`
}

function generateWeeks(data: HeatmapDay[]): HeatmapDay[][] {
  const weeks: HeatmapDay[][] = []
  let week: HeatmapDay[] = []
  for (let i = 0; i < data.length; i++) {
    week.push(data[i])
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: "", value: 0 })
    weeks.push(week)
  }
  return weeks
}

type TooltipState = {
  day: HeatmapDay
  x: number
  y: number
} | null

export function TrafficHeatmap({ data }: { data: HeatmapDay[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium">Traffic Heatmap</h3>
          <p className="text-xs text-muted-foreground">Daily visitor activity over the past year</p>
        </div>
        <div className="h-[140px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </div>
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value))
  const weeks = generateWeeks(data)

  const monthPositions: { label: string; col: number }[] = []
  let currentMonth = -1
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = weeks[w].find((d) => d.date)
    if (firstDay?.date) {
      const month = new Date(firstDay.date).getMonth()
      if (month !== currentMonth) {
        currentMonth = month
        monthPositions.push({ label: monthLabels[month], col: w })
      }
    }
  }

  function handleMouseEnter(e: React.MouseEvent, day: HeatmapDay) {
    if (!day.date || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cellRect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltip({
      day,
      x: cellRect.left - rect.left + cellRect.width / 2,
      y: cellRect.top - rect.top - 8,
    })
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-6">
        <h3 className="text-sm font-medium">Traffic Heatmap</h3>
        <p className="text-xs text-muted-foreground">Daily visitor activity over the past year</p>
      </div>
      <div className="w-full relative overflow-x-auto" ref={containerRef}>
      <div className="min-w-[700px]">
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
              <p className="text-xs font-medium">{formatDate(tooltip.day.date)}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{tooltip.day.value}</span> visitors
              </p>
            </div>
          </div>
        )}
        {/* Month labels */}
        <div className="flex ml-9 mb-2">
          {weeks.map((_, w) => {
            const mp = monthPositions.find((m) => m.col === w)
            return (
              <div key={w} className="flex-1 text-xs text-muted-foreground">
                {mp ? mp.label : ""}
              </div>
            )
          })}
        </div>
        {/* Grid: 7 rows (days) × N columns (weeks) */}
        <div className="flex w-full">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-2 shrink-0">
            {dayLabels.map((label, i) => (
              <div key={i} className="flex-1 flex items-center">
                <span className="text-xs text-muted-foreground w-7 text-right">{label}</span>
              </div>
            ))}
          </div>
          {/* Cells */}
          <div className="flex gap-[3px] flex-1">
            {weeks.map((week, w) => (
              <div key={w} className="flex flex-col gap-[3px] flex-1">
                {week.map((day, d) => (
                  <div
                    key={d}
                    className="aspect-square w-full rounded-[2px] cursor-default"
                    style={{ backgroundColor: `var(--heatmap-${day.date ? getHeatmapLevel(day.value, max) : 0})` }}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-[3px] mt-4">
          <span className="text-xs text-muted-foreground mr-1">Less</span>
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className="size-[12px] rounded-[2px]"
              style={{ backgroundColor: `var(--heatmap-${level})` }}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">More</span>
        </div>
      </div>
      </div>
    </div>
  )
}
