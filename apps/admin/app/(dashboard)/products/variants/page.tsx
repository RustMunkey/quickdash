import { db } from "@quickdash/db/client"
import { productVariants, products, inventory } from "@quickdash/db/schema"
import { eq, desc, count, and, lte, sql } from "@quickdash/db/drizzle"
import { VariantsTable } from "./variants-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
		filter?: string
	}>
}

export default async function VariantsPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const offset = (page - 1) * pageSize
	const filter = params.filter

	// Build filter conditions for stock status
	const conditions = []
	if (filter === "out") {
		conditions.push(sql`COALESCE(${inventory.quantity}, 0) = 0`)
	} else if (filter === "low") {
		conditions.push(
			sql`COALESCE(${inventory.quantity}, 0) > 0 AND COALESCE(${inventory.quantity}, 0) <= COALESCE(${inventory.lowStockThreshold}, 10)`
		)
	} else if (filter === "in") {
		conditions.push(
			sql`COALESCE(${inventory.quantity}, 0) > COALESCE(${inventory.lowStockThreshold}, 10)`
		)
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined

	const [variants, [total]] = await Promise.all([
		db
			.select({
				id: productVariants.id,
				name: productVariants.name,
				sku: productVariants.sku,
				price: productVariants.price,
				productId: productVariants.productId,
				productName: products.name,
				quantity: inventory.quantity,
				lowStockThreshold: inventory.lowStockThreshold,
			})
			.from(productVariants)
			.leftJoin(products, eq(products.id, productVariants.productId))
			.leftJoin(inventory, eq(inventory.variantId, productVariants.id))
			.where(where)
			.orderBy(desc(productVariants.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(productVariants)
			.leftJoin(inventory, eq(inventory.variantId, productVariants.id))
			.where(where),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				All product variants with inventory levels.
			</p>

			<VariantsTable
				variants={variants}
				totalCount={total.count}
				currentPage={page}
				currentFilter={filter}
			/>
		</div>
	)
}
