"use server"

import { db } from "@quickdash/db/client"
import { orders, inventory, productVariants, products } from "@quickdash/db/schema"
import { sql, and, gte, lte, eq, count, sum } from "@quickdash/db/drizzle"
import { getActiveWorkspace } from "@/lib/workspace"

function todayRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  return { from, to }
}

function yesterdayRange() {
  const today = todayRange()
  return {
    from: new Date(today.from.getTime() - 24 * 60 * 60 * 1000),
    to: today.from,
  }
}

export async function getQuickStats() {
  const today = todayRange()
  const yesterday = yesterdayRange()
  const workspace = await getActiveWorkspace()

  const [
    [todaySalesResult],
    [todayOrdersResult],
    [yesterdaySalesResult],
    [yesterdayOrdersResult],
    [pendingResult],
    [newCustomersResult],
    lowStockResult,
  ] = await Promise.all([
    // Today's sales
    db.select({ total: sum(orders.total) })
      .from(orders)
      .where(and(gte(orders.createdAt, today.from), lte(orders.createdAt, today.to))),
    // Today's orders
    db.select({ count: count() })
      .from(orders)
      .where(and(gte(orders.createdAt, today.from), lte(orders.createdAt, today.to))),
    // Yesterday's sales
    db.select({ total: sum(orders.total) })
      .from(orders)
      .where(and(gte(orders.createdAt, yesterday.from), lte(orders.createdAt, yesterday.to))),
    // Yesterday's orders
    db.select({ count: count() })
      .from(orders)
      .where(and(gte(orders.createdAt, yesterday.from), lte(orders.createdAt, yesterday.to))),
    // Pending orders
    db.select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "pending")),
    // New customers today (users whose first order was today)
    db.select({ count: sql<number>`count(*)` })
      .from(
        db.select({ userId: orders.userId })
          .from(orders)
          .groupBy(orders.userId)
          .having(
            sql`min(${orders.createdAt}) >= ${today.from.toISOString()}::timestamp AND min(${orders.createdAt}) <= ${today.to.toISOString()}::timestamp`
          )
          .as("new_customers")
      ),
    // Low stock items
    workspace?.id
      ? db.select({ count: count() })
          .from(inventory)
          .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
          .innerJoin(products, eq(productVariants.productId, products.id))
          .where(
            and(
              eq(products.workspaceId, workspace.id),
              sql`${inventory.quantity} - ${inventory.reservedQuantity} <= ${inventory.lowStockThreshold}`,
              sql`${inventory.quantity} - ${inventory.reservedQuantity} > 0`
            )
          )
      : Promise.resolve([{ count: 0 }]),
  ])

  const todaySales = Number(todaySalesResult?.total ?? 0)
  const yesterdaySales = Number(yesterdaySalesResult?.total ?? 0)
  const todayOrders = Number(todayOrdersResult?.count ?? 0)
  const yesterdayOrders = Number(yesterdayOrdersResult?.count ?? 0)

  function calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  return {
    todaySales,
    todayOrders,
    pendingOrders: Number(pendingResult?.count ?? 0),
    lowStockItems: Number(lowStockResult[0]?.count ?? 0),
    newCustomers: Number(newCustomersResult?.count ?? 0),
    salesChange: calcChange(todaySales, yesterdaySales),
    ordersChange: calcChange(todayOrders, yesterdayOrders),
  }
}
