import { db } from "@quickdash/db/client"
import { orders, orderItems, products, productVariants } from "@quickdash/db/schema"
import { sql, and, gte, lte, eq, sum, count } from "@quickdash/db/drizzle"
import type { DateRange } from "./types"

export type SkuMargin = {
  sku: string | null
  productName: string
  variantName: string | null
  unitsSold: number
  revenue: number
  cost: number
  margin: number
  marginPct: number
}

export async function getSkuMargins(range: DateRange, limit = 10, workspaceId: string): Promise<SkuMargin[]> {
  const rows = await db
    .select({
      sku: orderItems.sku,
      productName: orderItems.productName,
      variantName: orderItems.variantName,
      unitsSold: sum(orderItems.quantity),
      revenue: sum(orderItems.totalPrice),
      costPrice: products.costPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(orderItems.sku, orderItems.productName, orderItems.variantName, products.costPrice)
    .orderBy(sql`${sum(orderItems.totalPrice)} desc`)
    .limit(limit)

  return rows.map((r) => {
    const units = Number(r.unitsSold ?? 0)
    const revenue = Number(r.revenue ?? 0)
    const costPerUnit = Number(r.costPrice ?? 0)
    const totalCost = costPerUnit * units
    const margin = revenue - totalCost
    const marginPct = revenue > 0 ? Number(((margin / revenue) * 100).toFixed(1)) : 0

    return {
      sku: r.sku,
      productName: r.productName,
      variantName: r.variantName,
      unitsSold: units,
      revenue,
      cost: totalCost,
      margin,
      marginPct,
    }
  })
}

export async function getTotalMargin(range: DateRange, workspaceId: string): Promise<{ revenue: number; cost: number; margin: number; marginPct: number }> {
  const rows = await db
    .select({
      revenue: sum(orderItems.totalPrice),
      units: sum(orderItems.quantity),
      costPrice: products.costPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(orders.workspaceId, workspaceId), gte(orders.createdAt, range.from), lte(orders.createdAt, range.to)))
    .groupBy(products.costPrice)

  let totalRevenue = 0
  let totalCost = 0

  for (const row of rows) {
    const revenue = Number(row.revenue ?? 0)
    const units = Number(row.units ?? 0)
    const costPerUnit = Number(row.costPrice ?? 0)
    totalRevenue += revenue
    totalCost += costPerUnit * units
  }

  const margin = totalRevenue - totalCost
  const marginPct = totalRevenue > 0 ? Number(((margin / totalRevenue) * 100).toFixed(1)) : 0

  return { revenue: totalRevenue, cost: totalCost, margin, marginPct }
}

export async function getRefunds(range: DateRange, workspaceId: string): Promise<{ count: number; total: number }> {
  const [result] = await db
    .select({
      count: count(),
      total: sum(orders.total),
    })
    .from(orders)
    .where(
      and(
        eq(orders.workspaceId, workspaceId),
        eq(orders.status, "refunded"),
        gte(orders.createdAt, range.from),
        lte(orders.createdAt, range.to)
      )
    )

  return {
    count: Number(result?.count ?? 0),
    total: Number(result?.total ?? 0),
  }
}

export async function getCartAbandonment(range: DateRange, workspaceId: string): Promise<{ rate: number; abandonedCarts: number; completedCarts: number }> {
  const { analyticsEvents } = await import("@quickdash/db/schema")
  const { countDistinct } = await import("@quickdash/db/drizzle")

  const [checkouts] = await db
    .select({ count: countDistinct(analyticsEvents.sessionId) })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.workspaceId, workspaceId),
        eq(analyticsEvents.eventType, "begin_checkout"),
        gte(analyticsEvents.createdAt, range.from),
        lte(analyticsEvents.createdAt, range.to)
      )
    )

  const [purchases] = await db
    .select({ count: countDistinct(analyticsEvents.sessionId) })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.workspaceId, workspaceId),
        eq(analyticsEvents.eventType, "purchase"),
        gte(analyticsEvents.createdAt, range.from),
        lte(analyticsEvents.createdAt, range.to)
      )
    )

  const checkoutCount = Number(checkouts?.count ?? 0)
  const purchaseCount = Number(purchases?.count ?? 0)
  const abandonedCarts = Math.max(0, checkoutCount - purchaseCount)
  const rate = checkoutCount > 0 ? Number(((abandonedCarts / checkoutCount) * 100).toFixed(1)) : 0

  return { rate, abandonedCarts, completedCarts: purchaseCount }
}
