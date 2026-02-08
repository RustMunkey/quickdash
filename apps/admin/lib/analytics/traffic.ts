import { db } from "@quickdash/db/client"
import { analyticsEvents } from "@quickdash/db/schema"
import { sql, and, gte, lte, eq, count, countDistinct } from "@quickdash/db/drizzle"
import type { DateRange, StatWithChange, TimeSeriesPoint } from "./types"

function getPreviousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime()
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime()),
  }
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export async function getPageViews(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ count: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))

  const [previous] = await db
    .select({ count: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, prev.from), lte(analyticsEvents.createdAt, prev.to)))

  const value = Number(current?.count ?? 0)
  const previousValue = Number(previous?.count ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getUniqueVisitors(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ count: countDistinct(analyticsEvents.visitorId) })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))

  const [previous] = await db
    .select({ count: countDistinct(analyticsEvents.visitorId) })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, prev.from), lte(analyticsEvents.createdAt, prev.to)))

  const value = Number(current?.count ?? 0)
  const previousValue = Number(previous?.count ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getBounceRate(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  async function calcBounce(from: Date, to: Date): Promise<number> {
    const sessions = await db
      .select({
        sessionId: analyticsEvents.sessionId,
        pages: count(),
      })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, from), lte(analyticsEvents.createdAt, to)))
      .groupBy(analyticsEvents.sessionId)

    if (sessions.length === 0) return 0
    const bounces = sessions.filter((s) => Number(s.pages) === 1).length
    return Number(((bounces / sessions.length) * 100).toFixed(1))
  }

  const value = await calcBounce(range.from, range.to)
  const previousValue = await calcBounce(prev.from, prev.to)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getAvgSessionDuration(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  async function calcAvgDuration(from: Date, to: Date): Promise<number> {
    const sessions = await db
      .select({
        sessionId: analyticsEvents.sessionId,
        duration: sql<number>`extract(epoch from (max(${analyticsEvents.createdAt}) - min(${analyticsEvents.createdAt})))`,
      })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, from), lte(analyticsEvents.createdAt, to)))
      .groupBy(analyticsEvents.sessionId)
      .having(sql`count(*) > 1`)

    if (sessions.length === 0) return 0
    const totalDuration = sessions.reduce((acc, s) => acc + Number(s.duration ?? 0), 0)
    return Math.round(totalDuration / sessions.length)
  }

  const value = await calcAvgDuration(range.from, range.to)
  const previousValue = await calcAvgDuration(prev.from, prev.to)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getVisitorsOverTime(range: DateRange, workspaceId: string): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`,
      value: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))
    .groupBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}

export type HeatmapDay = { date: string; value: number }

export async function getHeatmapData(workspaceId: string): Promise<HeatmapDay[]> {
  const startDate = new Date(Date.now() - 364 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, startDate)))
    .groupBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}

export type TrafficSource = { source: string; visits: number; percentage: number }

export async function getTrafficSources(range: DateRange, workspaceId: string): Promise<TrafficSource[]> {
  const rows = await db
    .select({
      source: sql<string>`coalesce(nullif(${analyticsEvents.referrer}, ''), 'Direct')`,
      visits: count(),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))
    .groupBy(sql`coalesce(nullif(${analyticsEvents.referrer}, ''), 'Direct')`)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  const total = rows.reduce((acc, r) => acc + Number(r.visits), 0) || 1

  return rows.map((r) => ({
    source: r.source,
    visits: Number(r.visits),
    percentage: Number(((Number(r.visits) / total) * 100).toFixed(1)),
  }))
}

export type TopPage = { pathname: string; views: number; visitors: number }

export async function getTopPages(range: DateRange, workspaceId: string): Promise<TopPage[]> {
  const rows = await db
    .select({
      pathname: analyticsEvents.pathname,
      views: count(),
      visitors: countDistinct(analyticsEvents.visitorId),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.workspaceId, workspaceId), gte(analyticsEvents.createdAt, range.from), lte(analyticsEvents.createdAt, range.to)))
    .groupBy(analyticsEvents.pathname)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  return rows.map((r) => ({
    pathname: r.pathname,
    views: Number(r.views),
    visitors: Number(r.visitors),
  }))
}
