"use server"

import { db } from "@quickdash/db/client"
import { products, orders, users, workspaceMembers, friendships } from "@quickdash/db/schema"
import { eq, and, or, ilike, ne, desc } from "@quickdash/db/drizzle"
import { requireWorkspace } from "@/lib/workspace"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export type SearchResult = {
	id: string
	title: string
	subtitle?: string
	url: string
	type: "product" | "order" | "customer" | "friend" | "page"
}

export async function globalSearch(query: string): Promise<{
	products: SearchResult[]
	orders: SearchResult[]
	customers: SearchResult[]
}> {
	if (!query || query.length < 2) {
		return { products: [], orders: [], customers: [] }
	}

	const workspace = await requireWorkspace()
	const pattern = `%${query}%`

	const [productResults, orderResults, customerResults] = await Promise.all([
		// Search products
		db
			.select({ id: products.id, name: products.name, slug: products.slug })
			.from(products)
			.where(and(eq(products.workspaceId, workspace.id), ilike(products.name, pattern)))
			.limit(5),

		// Search orders by order number
		db
			.select({
				id: orders.id,
				orderNumber: orders.orderNumber,
				status: orders.status,
			})
			.from(orders)
			.where(and(eq(orders.workspaceId, workspace.id), ilike(orders.orderNumber, pattern)))
			.orderBy(desc(orders.createdAt))
			.limit(5),

		// Search customers (workspace members)
		db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				username: users.username,
			})
			.from(users)
			.innerJoin(workspaceMembers, eq(users.id, workspaceMembers.userId))
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspace.id),
					or(ilike(users.name, pattern), ilike(users.email, pattern), ilike(users.username, pattern))
				)
			)
			.limit(5),
	])

	return {
		products: productResults.map((p) => ({
			id: p.id,
			title: p.name,
			subtitle: p.slug,
			url: `/products/${p.id}`,
			type: "product" as const,
		})),
		orders: orderResults.map((o) => ({
			id: o.id,
			title: `Order #${o.orderNumber}`,
			subtitle: o.status || undefined,
			url: `/orders/${o.id}`,
			type: "order" as const,
		})),
		customers: customerResults.map((c) => ({
			id: c.id,
			title: c.name || c.email,
			subtitle: c.username ? `@${c.username}` : c.email,
			url: `/customers/${c.id}`,
			type: "customer" as const,
		})),
	}
}

export async function searchFriends(query: string): Promise<SearchResult[]> {
	if (!query || query.length < 1) return []

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return []

	const userId = session.user.id
	const pattern = `%${query}%`

	// Get accepted friends matching query
	const friends = await db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
		})
		.from(friendships)
		.innerJoin(
			users,
			or(
				and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
				and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId))
			)
		)
		.where(
			and(
				eq(friendships.status, "accepted"),
				or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
				ne(users.id, userId),
				or(ilike(users.name, pattern), ilike(users.username, pattern))
			)
		)
		.limit(10)

	return friends.map((f) => ({
		id: f.id,
		title: f.name || "Unknown",
		subtitle: f.username ? `@${f.username}` : undefined,
		url: `/messages?friend=${f.id}`,
		type: "friend" as const,
	}))
}
