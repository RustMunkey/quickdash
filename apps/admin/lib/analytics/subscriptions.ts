import { db } from "@quickdash/db/client"
import { subscriptions } from "@quickdash/db/schema"
import { sql, and, or, gte, lte, lt, eq, count, sum, isNull } from "@quickdash/db/drizzle"
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

export async function getActiveSubscriptions(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), eq(subscriptions.status, "active")))

  return Number(result?.count ?? 0)
}

export async function getMRR(workspaceId: string): Promise<StatWithChange> {
  const activeSubs = await db
    .select({
      frequency: subscriptions.frequency,
      price: subscriptions.pricePerDelivery,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), eq(subscriptions.status, "active")))

  let mrr = 0
  for (const sub of activeSubs) {
    const price = Number(sub.price)
    switch (sub.frequency) {
      case "weekly":
        mrr += price * 4.33
        break
      case "biweekly":
        mrr += price * 2.17
        break
      case "monthly":
        mrr += price
        break
      case "bimonthly":
        mrr += price * 0.5
        break
      case "quarterly":
        mrr += price / 3
        break
      default:
        mrr += price
    }
  }

  const value = Number(mrr.toFixed(2))
  return { value, previousValue: value, change: 0 }
}

export async function getChurnRate(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  async function calcChurn(from: Date, to: Date): Promise<number> {
    const [activeAtStart] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.workspaceId, workspaceId),
          lt(subscriptions.createdAt, from),
          or(
            isNull(subscriptions.cancelledAt),
            gte(subscriptions.cancelledAt, from)
          )
        )
      )

    const [cancelled] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(and(eq(subscriptions.workspaceId, workspaceId), gte(subscriptions.cancelledAt, from), lte(subscriptions.cancelledAt, to)))

    const active = Number(activeAtStart?.count ?? 0)
    const churned = Number(cancelled?.count ?? 0)
    if (active === 0) return 0
    return Number(((churned / active) * 100).toFixed(1))
  }

  const value = await calcChurn(range.from, range.to)
  const previousValue = await calcChurn(prev.from, prev.to)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getSubscriptionGrowth(range: DateRange, workspaceId: string): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${subscriptions.createdAt}, 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), gte(subscriptions.createdAt, range.from), lte(subscriptions.createdAt, range.to)))
    .groupBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${subscriptions.createdAt}, 'YYYY-MM-DD')`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}

export async function getNewSubscriptions(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), gte(subscriptions.createdAt, range.from), lte(subscriptions.createdAt, range.to)))

  const [previous] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), gte(subscriptions.createdAt, prev.from), lte(subscriptions.createdAt, prev.to)))

  const value = Number(current?.count ?? 0)
  const previousValue = Number(previous?.count ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getRevenueSplit(range: DateRange, workspaceId: string): Promise<{ subscription: number; oneTime: number; subscriptionPct: number }> {
  const subsInRange = await db
    .select({
      price: subscriptions.pricePerDelivery,
      totalDeliveries: subscriptions.totalDeliveries,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.workspaceId, workspaceId),
        eq(subscriptions.status, "active"),
        gte(subscriptions.lastDeliveryAt, range.from),
        lte(subscriptions.lastDeliveryAt, range.to)
      )
    )

  const subscriptionRevenue = subsInRange.reduce((acc, s) => acc + Number(s.price ?? 0), 0)

  const { orders } = await import("@quickdash/db/schema")
  const [orderTotal] = await db
    .select({ total: sum(orders.total) })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const totalOrderRevenue = Number(orderTotal?.total ?? 0)
  const oneTimeRevenue = Math.max(0, totalOrderRevenue - subscriptionRevenue)
  const subscriptionPct = totalOrderRevenue > 0
    ? Number(((subscriptionRevenue / totalOrderRevenue) * 100).toFixed(1))
    : 0

  return {
    subscription: Number(subscriptionRevenue.toFixed(2)),
    oneTime: Number(oneTimeRevenue.toFixed(2)),
    subscriptionPct,
  }
}

export async function getSubscriptionsByFrequency(workspaceId: string): Promise<{ frequency: string; count: number }[]> {
  const rows = await db
    .select({
      frequency: subscriptions.frequency,
      count: count(),
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.workspaceId, workspaceId), eq(subscriptions.status, "active")))
    .groupBy(subscriptions.frequency)
    .orderBy(sql`count(*) desc`)

  return rows.map((r) => ({ frequency: r.frequency, count: Number(r.count) }))
}
