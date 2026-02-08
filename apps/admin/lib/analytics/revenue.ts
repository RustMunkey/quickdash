import { db } from "@quickdash/db/client"
import { orders, orderItems, categories, products, productVariants } from "@quickdash/db/schema"
import { sql, and, gte, lte, eq, sum, count, avg } from "@quickdash/db/drizzle"
import type { DateRange, StatWithChange, TimeSeriesPoint, CategoryBreakdown } from "./types"

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

export async function getRevenueStats(range: DateRange): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ total: sum(orders.total) })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const [previous] = await db
    .select({ total: sum(orders.total) })
    .from(orders)
    .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const value = Number(current?.total ?? 0)
  const previousValue = Number(previous?.total ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getOrderCount(range: DateRange): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const [previous] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const value = Number(current?.count ?? 0)
  const previousValue = Number(previous?.count ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getAvgOrderValue(range: DateRange): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ avg: avg(orders.total) })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const [previous] = await db
    .select({ avg: avg(orders.total) })
    .from(orders)
    .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const value = Number(current?.avg ?? 0)
  const previousValue = Number(previous?.avg ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getRevenueOverTime(range: DateRange): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      value: sum(orders.total),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}

export async function getOrdersOverTime(range: DateRange): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      value: count(),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}

export async function getRevenueByCategory(range: DateRange): Promise<CategoryBreakdown[]> {
  const rows = await db
    .select({
      name: categories.name,
      revenue: sum(orderItems.totalPrice),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(categories.name)
    .orderBy(sql`${sum(orderItems.totalPrice)} desc`)
    .limit(5)

  return rows.map((r) => ({ name: r.name, revenue: Number(r.revenue ?? 0) }))
}

export async function getGrossSales(range: DateRange): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ total: sum(orders.subtotal) })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const [previous] = await db
    .select({ total: sum(orders.subtotal) })
    .from(orders)
    .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const value = Number(current?.total ?? 0)
  const previousValue = Number(previous?.total ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getDiscountsGiven(range: DateRange): Promise<StatWithChange> {
  const prev = getPreviousRange(range)

  const [current] = await db
    .select({ total: sum(orders.discountAmount) })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))

  const [previous] = await db
    .select({ total: sum(orders.discountAmount) })
    .from(orders)
    .where(and(gte(orders.createdAt, prev.from), lte(orders.createdAt, prev.to)))

  const value = Number(current?.total ?? 0)
  const previousValue = Number(previous?.total ?? 0)
  return { value, previousValue, change: calcChange(value, previousValue) }
}

export async function getTopProducts(range: DateRange): Promise<{ name: string; units: number; revenue: number }[]> {
  const rows = await db
    .select({
      name: orderItems.productName,
      units: sum(orderItems.quantity),
      revenue: sum(orderItems.totalPrice),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(orderItems.productName)
    .orderBy(sql`${sum(orderItems.totalPrice)} desc`)
    .limit(5)

  return rows.map((r) => ({
    name: r.name,
    units: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
}

export async function getRecentOrders(limit = 5): Promise<{ id: string; orderNumber: string; total: number; status: string; createdAt: Date }[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(sql`${orders.createdAt} desc`)
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    total: Number(r.total),
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function getPendingOrdersCount(): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, "pending"))

  return Number(result?.count ?? 0)
}

export async function getSalesByDay(range: DateRange): Promise<TimeSeriesPoint[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${orders.createdAt}, 'Dy')`,
      value: sum(orders.total),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(sql`to_char(${orders.createdAt}, 'Dy')`, sql`extract(dow from ${orders.createdAt})`)
    .orderBy(sql`extract(dow from ${orders.createdAt})`)

  return rows.map((r) => ({ date: r.date, value: Number(r.value ?? 0) }))
}
