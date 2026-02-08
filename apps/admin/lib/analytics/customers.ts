import { db } from "@quickdash/db/client"
import { users, orders } from "@quickdash/db/schema"
import { sql, and, gte, lte, eq, count, sum, desc } from "@quickdash/db/drizzle"
import type { DateRange, StatWithChange, TimeSeriesPoint, TopCustomer, CustomerSegment } from "./types"

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

export async function getTotalCustomers(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(distinct ${orders.userId})` })
    .from(orders)
    .where(eq(orders.workspaceId, workspaceId))

  return Number(result?.count ?? 0)
}

export async function getNewCustomers(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  async function countNewInRange(from: Date, to: Date): Promise<number> {
    const rows = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.workspaceId, workspaceId))
      .groupBy(orders.userId)
      .having(sql`min(${orders.createdAt}) >= ${from.toISOString()}::timestamp AND min(${orders.createdAt}) <= ${to.toISOString()}::timestamp`)

    return rows.length
  }

  const value = await countNewInRange(range.from, range.to)
  const previousValue = await countNewInRange(prev.from, prev.to)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getRepeatRate(range: DateRange, workspaceId: string): Promise<StatWithChange> {
  const [totalBuyers] = await db
    .select({ count: sql<number>`count(distinct ${orders.userId})` })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const repeatBuyers = await db
    .select({ userId: orders.userId, orderCount: count() })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(orders.userId)
    .having(sql`count(*) > 1`)

  const total = Number(totalBuyers?.count ?? 0)
  const repeats = repeatBuyers.length
  const value = total > 0 ? Number(((repeats / total) * 100).toFixed(1)) : 0

  const prev = getPreviousRange(range)
  const [prevTotalBuyers] = await db
    .select({ count: sql<number>`count(distinct ${orders.userId})` })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const prevRepeatBuyers = await db
    .select({ userId: orders.userId, orderCount: count() })
    .from(orders)
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))
    .groupBy(orders.userId)
    .having(sql`count(*) > 1`)

  const prevTotal = Number(prevTotalBuyers?.count ?? 0)
  const prevRepeats = prevRepeatBuyers.length
  const previousValue = prevTotal > 0 ? Number(((prevRepeats / prevTotal) * 100).toFixed(1)) : 0

  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getAvgLifetimeValue(workspaceId: string): Promise<StatWithChange> {
  const rows = await db
    .select({
      userId: orders.userId,
      totalSpent: sum(orders.total),
    })
    .from(orders)
    .where(eq(orders.workspaceId, workspaceId))
    .groupBy(orders.userId)

  const totalCustomers = rows.length
  const totalRevenue = rows.reduce((acc, r) => acc + Number(r.totalSpent ?? 0), 0)
  const value = totalCustomers > 0 ? Number((totalRevenue / totalCustomers).toFixed(2)) : 0

  return { value, previousValue: value, change: 0 }
}

export async function getCustomerGrowth(range: DateRange, workspaceId: string): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(min(${orders.createdAt}), 'YYYY-MM-DD')`,
      userId: orders.userId,
    })
    .from(orders)
    .where(eq(orders.workspaceId, workspaceId))
    .groupBy(orders.userId)
    .having(sql`min(${orders.createdAt}) >= ${range.from.toISOString()}::timestamp AND min(${orders.createdAt}) <= ${range.to.toISOString()}::timestamp`)

  const byDate: Record<string, number> = {}
  for (const row of rows) {
    byDate[row.date] = (byDate[row.date] ?? 0) + 1
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

export async function getTopCustomers(limit = 5, workspaceId: string): Promise<TopCustomer[]> {
  const rows = await db
    .select({
      name: users.name,
      email: users.email,
      orders: count(orders.id),
      spent: sum(orders.total),
    })
    .from(users)
    .innerJoin(orders, eq(orders.userId, users.id))
    .where(eq(orders.workspaceId, workspaceId))
    .groupBy(users.id, users.name, users.email)
    .orderBy(desc(sum(orders.total)))
    .limit(limit)

  return rows.map((r) => ({
    name: r.name,
    email: r.email,
    orders: Number(r.orders ?? 0),
    spent: Number(r.spent ?? 0),
  }))
}

export async function getCustomerSegments(workspaceId: string): Promise<CustomerSegment[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const customerStats = await db
    .select({
      userId: orders.userId,
      orderCount: count(orders.id),
      lastOrder: sql<Date>`max(${orders.createdAt})`,
      firstOrder: sql<Date>`min(${orders.createdAt})`,
    })
    .from(orders)
    .where(eq(orders.workspaceId, workspaceId))
    .groupBy(orders.userId)

  let newCount = 0
  let returningCount = 0
  let loyalCount = 0
  let atRiskCount = 0

  for (const customer of customerStats) {
    const orderCount = Number(customer.orderCount)
    const lastOrder = customer.lastOrder
    const firstOrder = customer.firstOrder

    if (lastOrder && lastOrder < sixtyDaysAgo) {
      atRiskCount++
    } else if (firstOrder && firstOrder >= thirtyDaysAgo && orderCount === 1) {
      newCount++
    } else if (orderCount >= 6) {
      loyalCount++
    } else {
      returningCount++
    }
  }

  const total = customerStats.length || 1

  return [
    { label: "New", count: newCount, percentage: Math.round((newCount / total) * 100), description: "First purchase in last 30 days" },
    { label: "Returning", count: returningCount, percentage: Math.round((returningCount / total) * 100), description: "2-5 purchases total" },
    { label: "Loyal", count: loyalCount, percentage: Math.round((loyalCount / total) * 100), description: "6+ purchases total" },
    { label: "At Risk", count: atRiskCount, percentage: Math.round((atRiskCount / total) * 100), description: "No purchase in 60+ days" },
  ]
}
