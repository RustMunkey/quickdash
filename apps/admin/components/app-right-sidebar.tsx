"use client"

import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Clock01Icon,
  Call02Icon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import {
  RightSidebar,
  RightSidebarContent,
  RightSidebarGroup,
  RightSidebarGroupContent,
  RightSidebarSeparator,
} from "@/components/ui/right-sidebar"
import { Calendar } from "@/components/ui/calendar"
import { NotificationList } from "@/components/notifications/notification-list"
import { Button } from "@/components/ui/button"
import { useSidebarMode } from "@/lib/sidebar-mode"
import { WorkflowRightSidebarContent } from "@/components/workflow-right-sidebar"
import { cn } from "@/lib/utils"
import { getEventDatesForMonth, getUpcomingEvents } from "@/app/(dashboard)/scheduling/actions"
import type { SchedulingEvent } from "@/app/(dashboard)/scheduling/types"
import { getEventColorClass } from "@/app/(dashboard)/scheduling/types"
import Link from "next/link"

const EVENT_TYPE_ICONS: Record<string, typeof Calendar01Icon> = {
  meeting: UserGroupIcon,
  call: Call02Icon,
  appointment: Calendar01Icon,
  task: CheckmarkCircle02Icon,
  reminder: Clock01Icon,
}

function formatEventTime(iso: string, isAllDay: boolean): string {
  if (isAllDay) return "All day"
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 0) return "Now"
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffHours < 24) return `in ${diffHours}h`
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" })
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function UpcomingEventsList({ selectedDate }: { selectedDate?: Date }) {
  const [events, setEvents] = useState<SchedulingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getUpcomingEvents(5)
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Filter by selected date if any
  const filteredEvents = selectedDate
    ? events.filter((e) => {
        const d = new Date(e.startsAt)
        return d.toDateString() === selectedDate.toDateString()
      })
    : events

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-sidebar-foreground/70 uppercase tracking-wide">
            Upcoming Events
          </span>
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-sidebar-foreground/70 uppercase tracking-wide">
          Upcoming Events
        </span>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" asChild>
          <Link href="/scheduling">View all</Link>
        </Button>
      </div>
      {filteredEvents.length === 0 ? (
        <p className="text-[11px] text-sidebar-foreground/50 py-1">No upcoming events</p>
      ) : (
        <div className="space-y-1">
          {filteredEvents.map((event) => {
            const TypeIcon = EVENT_TYPE_ICONS[event.type] || Calendar01Icon
            return (
              <Link
                key={event.id}
                href="/scheduling"
                className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-sidebar-accent/50 transition-colors group"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getEventColorClass(event.color))} />
                <HugeiconsIcon icon={TypeIcon} size={12} className="text-sidebar-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate leading-tight">{event.title}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
                    {formatEventTime(event.startsAt, event.isAllDay)}
                  </p>
                </div>
                <span className="text-[9px] text-sidebar-foreground/40 shrink-0">
                  {formatRelativeDate(event.startsAt)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DefaultRightSidebarContent() {
  // undefined = show all, Date = filter by that date
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)
  // Visual selection in calendar (always shows today highlighted)
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date())
  // Event dates for calendar dots
  const [eventDates, setEventDates] = useState<Set<string>>(new Set())
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date())

  // Fetch event dates whenever the displayed month changes
  const fetchEventDates = useCallback((month: Date) => {
    getEventDatesForMonth(month.getFullYear(), month.getMonth())
      .then((dates) => setEventDates(new Set(dates)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchEventDates(displayedMonth)
  }, [displayedMonth, fetchEventDates])

  const handleDateSelect = (date: Date | undefined) => {
    setCalendarDate(date)
    // Toggle filter: if clicking same date, clear filter
    if (date && filterDate && date.toDateString() === filterDate.toDateString()) {
      setFilterDate(undefined)
    } else {
      setFilterDate(date)
    }
  }

  const clearFilter = () => {
    setFilterDate(undefined)
    setCalendarDate(new Date())
  }

  // Calendar modifiers: mark days that have events
  const hasEvent = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    return eventDates.has(key)
  }

  return (
    <>
      {/* Calendar */}
      <RightSidebarGroup className="p-0">
        <RightSidebarGroupContent>
          <div className="flex flex-col items-center pt-2 [--cell-size:1.6rem]">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={handleDateSelect}
              onMonthChange={setDisplayedMonth}
              className="!p-0 !bg-transparent"
              modifiers={{ hasEvent }}
              modifiersClassNames={{
                hasEvent: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
              }}
            />
            {filterDate && (
              <div className="flex items-center justify-between w-full px-2 pt-1 pb-0.5">
                <span className="text-[10px] text-sidebar-foreground/50">
                  Filtering: {filterDate.toLocaleDateString("en-US")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={clearFilter}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </RightSidebarGroupContent>
      </RightSidebarGroup>

      <RightSidebarSeparator />

      {/* Upcoming Events */}
      <RightSidebarGroup className="p-0">
        <RightSidebarGroupContent>
          <UpcomingEventsList selectedDate={filterDate} />
        </RightSidebarGroupContent>
      </RightSidebarGroup>

      <RightSidebarSeparator />

      {/* Notifications */}
      <RightSidebarGroup className="p-0">
        <RightSidebarGroupContent>
          <NotificationList selectedDate={filterDate} />
        </RightSidebarGroupContent>
      </RightSidebarGroup>
    </>
  )
}

export function AppRightSidebar() {
  const { mode } = useSidebarMode()
  const isWorkflowMode = mode === "workflow"

  return (
    <RightSidebar variant="sidebar">
      <RightSidebarContent>
        {isWorkflowMode ? (
          <WorkflowRightSidebarContent />
        ) : (
          <DefaultRightSidebarContent />
        )}
      </RightSidebarContent>
    </RightSidebar>
  )
}
