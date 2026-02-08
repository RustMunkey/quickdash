"use server"

import { eq, and, desc, count, ilike, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { products, productVariants, categories, inventory } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { slugify } from "@/lib/format"
import { pusherServer } from "@/lib/pusher-server"
import { wsChannel } from "@/lib/pusher-channels"
import { fireWebhooks } from "@/lib/webhooks/outgoing"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { emitProductCreated, emitProductUpdated } from "@/lib/workflows"

async function requireProductsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage products")
	}
	return workspace
}

interface GetProductsParams {
	page?: number
	pageSize?: number
	search?: string
	category?: string
	status?: string
}

export async function getProducts(params: GetProductsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search, category, status } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace
	const conditions = [eq(products.workspaceId, workspace.id)]
	if (search) {
		conditions.push(ilike(products.name, `%${search}%`))
	}
	if (category) {
		conditions.push(eq(products.categoryId, category))
	}
	if (status === "active") {
		conditions.push(eq(products.isActive, true))
	} else if (status === "inactive") {
		conditions.push(eq(products.isActive, false))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: products.id,
				name: products.name,
				slug: products.slug,
				price: products.price,
				thumbnail: products.thumbnail,
				isActive: products.isActive,
				isFeatured: products.isFeatured,
				categoryId: products.categoryId,
				categoryName: categories.name,
				createdAt: products.createdAt,
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(where)
			.orderBy(desc(products.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(products).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function getProduct(id: string) {
	const workspace = await requireWorkspace()

	const [product] = await db
		.select()
		.from(products)
		.where(and(eq(products.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!product) throw new Error("Product not found")

	const variants = await db
		.select({
			id: productVariants.id,
			name: productVariants.name,
			sku: productVariants.sku,
			price: productVariants.price,
			attributes: productVariants.attributes,
			isActive: productVariants.isActive,
			quantity: inventory.quantity,
			reservedQuantity: inventory.reservedQuantity,
			lowStockThreshold: inventory.lowStockThreshold,
		})
		.from(productVariants)
		.leftJoin(inventory, eq(inventory.variantId, productVariants.id))
		.where(eq(productVariants.productId, id))

	return { ...product, variants }
}

export async function getCategories() {
	const workspace = await requireWorkspace()
	return db
		.select()
		.from(categories)
		.where(eq(categories.workspaceId, workspace.id))
		.orderBy(categories.sortOrder)
}

interface ProductData {
	name: string
	slug?: string
	description?: string
	shortDescription?: string
	price: string
	compareAtPrice?: string
	salePrice?: string
	saleStartsAt?: string // ISO date string
	saleEndsAt?: string // ISO date string
	costPrice?: string
	sourceType?: string
	categoryId?: string
	tags?: string[]
	images?: string[]
	thumbnail?: string
	isActive?: boolean
	isSubscribable?: boolean
	isFeatured?: boolean
	weight?: string
	weightUnit?: string
	metaTitle?: string
	metaDescription?: string
}

export async function createProduct(data: ProductData) {
	const workspace = await requireProductsPermission()

	const slug = data.slug || slugify(data.name)

	const [product] = await db
		.insert(products)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			slug,
			description: data.description || null,
			shortDescription: data.shortDescription || null,
			price: data.price,
			compareAtPrice: data.compareAtPrice || null,
			salePrice: data.salePrice || null,
			saleStartsAt: data.saleStartsAt ? new Date(data.saleStartsAt) : null,
			saleEndsAt: data.saleEndsAt ? new Date(data.saleEndsAt) : null,
			costPrice: data.costPrice || null,
			sourceType: data.sourceType || "owned",
			categoryId: data.categoryId || null,
			tags: data.tags || [],
			images: data.images || [],
			thumbnail: data.thumbnail || null,
			isActive: data.isActive ?? true,
			isSubscribable: data.isSubscribable ?? false,
			isFeatured: data.isFeatured ?? false,
			weight: data.weight || null,
			weightUnit: data.weightUnit || "oz",
			metaTitle: data.metaTitle || null,
			metaDescription: data.metaDescription || null,
		})
		.returning()

	await logAudit({
		action: "product.created",
		targetType: "product",
		targetId: product.id,
		targetLabel: product.name,
	})

	// Broadcast for live updates
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "products"), "product:created", {
			id: product.id,
			name: product.name,
			slug: product.slug,
			price: product.price,
			thumbnail: product.thumbnail,
			isActive: product.isActive,
			isFeatured: product.isFeatured,
			categoryId: product.categoryId,
			createdAt: product.createdAt?.toISOString(),
		})
	}

	// Fire outgoing webhook
	await fireWebhooks("product.created", {
		productId: product.id,
		name: product.name,
		slug: product.slug,
		price: product.price,
		isActive: product.isActive,
		isFeatured: product.isFeatured,
		categoryId: product.categoryId,
		createdAt: product.createdAt?.toISOString(),
	}, workspace.id)

	// Emit workflow event (non-blocking)
	emitProductCreated({
		workspaceId: workspace.id,
		productId: product.id,
		name: product.name,
		slug: product.slug,
		price: product.price,
	}).catch(() => {}) // Ignore Inngest errors

	return product
}

export async function updateProduct(id: string, data: Partial<ProductData>) {
	const workspace = await requireProductsPermission()

	const updates: Record<string, unknown> = { updatedAt: new Date() }
	if (data.name !== undefined) updates.name = data.name
	if (data.slug !== undefined) updates.slug = data.slug
	if (data.description !== undefined) updates.description = data.description || null
	if (data.shortDescription !== undefined) updates.shortDescription = data.shortDescription || null
	if (data.price !== undefined) updates.price = data.price
	if (data.compareAtPrice !== undefined) updates.compareAtPrice = data.compareAtPrice || null
	if (data.salePrice !== undefined) updates.salePrice = data.salePrice || null
	if (data.saleStartsAt !== undefined) updates.saleStartsAt = data.saleStartsAt ? new Date(data.saleStartsAt) : null
	if (data.saleEndsAt !== undefined) updates.saleEndsAt = data.saleEndsAt ? new Date(data.saleEndsAt) : null
	if (data.costPrice !== undefined) updates.costPrice = data.costPrice || null
	if (data.sourceType !== undefined) updates.sourceType = data.sourceType
	if (data.categoryId !== undefined) updates.categoryId = data.categoryId || null
	if (data.tags !== undefined) updates.tags = data.tags
	if (data.images !== undefined) updates.images = data.images
	if (data.thumbnail !== undefined) updates.thumbnail = data.thumbnail || null
	if (data.isActive !== undefined) updates.isActive = data.isActive
	if (data.isSubscribable !== undefined) updates.isSubscribable = data.isSubscribable
	if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured
	if (data.weight !== undefined) updates.weight = data.weight || null
	if (data.weightUnit !== undefined) updates.weightUnit = data.weightUnit
	if (data.metaTitle !== undefined) updates.metaTitle = data.metaTitle || null
	if (data.metaDescription !== undefined) updates.metaDescription = data.metaDescription || null

	const [product] = await db
		.update(products)
		.set(updates)
		.where(and(eq(products.id, id), eq(products.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "product.updated",
		targetType: "product",
		targetId: id,
		targetLabel: product.name,
	})

	// Broadcast for live updates
	if (pusherServer) {
		await pusherServer.trigger(wsChannel(workspace.id, "products"), "product:updated", {
			id: product.id,
			name: product.name,
			slug: product.slug,
			price: product.price,
			thumbnail: product.thumbnail,
			isActive: product.isActive,
			isFeatured: product.isFeatured,
			categoryId: product.categoryId,
		})
	}

	// Fire outgoing webhook
	await fireWebhooks("product.updated", {
		productId: product.id,
		name: product.name,
		slug: product.slug,
		price: product.price,
		isActive: product.isActive,
		isFeatured: product.isFeatured,
		categoryId: product.categoryId,
		updatedAt: product.updatedAt?.toISOString(),
	}, workspace.id)

	// Emit workflow event (non-blocking)
	emitProductUpdated({
		workspaceId: workspace.id,
		productId: product.id,
		name: product.name,
		slug: product.slug,
		price: product.price,
	}).catch(() => {}) // Ignore Inngest errors

	return product
}

export async function deleteProduct(id: string) {
	const workspace = await requireProductsPermission()

	const [product] = await db
		.select({ name: products.name })
		.from(products)
		.where(and(eq(products.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!product) throw new Error("Product not found")

	await db.delete(products).where(and(eq(products.id, id), eq(products.workspaceId, workspace.id)))

	await logAudit({
		action: "product.deleted",
		targetType: "product",
		targetId: id,
		targetLabel: product?.name,
	})

	// Fire outgoing webhook
	await fireWebhooks("product.deleted", {
		productId: id,
		name: product?.name,
	}, workspace.id)
}

export async function bulkUpdateProducts(ids: string[], action: "activate" | "deactivate" | "delete") {
	const workspace = await requireProductsPermission()

	// Only affect products in this workspace
	const workspaceCondition = and(inArray(products.id, ids), eq(products.workspaceId, workspace.id))

	if (action === "delete") {
		await db.delete(products).where(workspaceCondition)
		await logAudit({
			action: "product.deleted",
			targetType: "product",
			metadata: { count: ids.length, bulk: true },
		})
		// Broadcast deletions
		if (pusherServer) {
			await pusherServer.trigger(wsChannel(workspace.id, "products"), "product:deleted", { ids })
		}
		// Fire webhooks for each deleted product
		for (const productId of ids) {
			await fireWebhooks("product.deleted", {
				productId,
				bulk: true,
			}, workspace.id)
		}
	} else {
		const isActive = action === "activate"
		await db
			.update(products)
			.set({ isActive, updatedAt: new Date() })
			.where(workspaceCondition)
		await logAudit({
			action: "product.updated",
			targetType: "product",
			metadata: { count: ids.length, bulk: true, action },
		})
		// Broadcast updates
		if (pusherServer) {
			await pusherServer.trigger(wsChannel(workspace.id, "products"), "product:bulk-updated", { ids, isActive })
		}
		// Fire webhooks for each updated product
		for (const productId of ids) {
			await fireWebhooks("product.updated", {
				productId,
				isActive,
				bulk: true,
			}, workspace.id)
		}
	}
}

interface VariantData {
	name: string
	sku: string
	price?: string
	attributes?: Record<string, string>
	isActive?: boolean
	quantity?: number
}

export async function createVariant(productId: string, data: VariantData) {
	const workspace = await requireProductsPermission()

	// Verify product belongs to this workspace
	const [product] = await db
		.select({ id: products.id })
		.from(products)
		.where(and(eq(products.id, productId), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!product) throw new Error("Product not found")

	const [variant] = await db
		.insert(productVariants)
		.values({
			productId,
			name: data.name,
			sku: data.sku,
			price: data.price || null,
			attributes: data.attributes || {},
			isActive: data.isActive ?? true,
		})
		.returning()

	// Create inventory record
	await db.insert(inventory).values({
		variantId: variant.id,
		quantity: data.quantity ?? 0,
	})

	await logAudit({
		action: "product.updated",
		targetType: "variant",
		targetId: variant.id,
		targetLabel: `${data.name} (${data.sku})`,
		metadata: { action: "variant_added", productId },
	})

	return variant
}

export async function updateVariant(id: string, data: Partial<VariantData>) {
	const workspace = await requireProductsPermission()

	// Verify variant's product belongs to this workspace
	const [variant] = await db
		.select({ id: productVariants.id, productId: productVariants.productId })
		.from(productVariants)
		.innerJoin(products, eq(products.id, productVariants.productId))
		.where(and(eq(productVariants.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!variant) throw new Error("Variant not found")

	const updates: Record<string, unknown> = {}
	if (data.name !== undefined) updates.name = data.name
	if (data.sku !== undefined) updates.sku = data.sku
	if (data.price !== undefined) updates.price = data.price || null
	if (data.attributes !== undefined) updates.attributes = data.attributes
	if (data.isActive !== undefined) updates.isActive = data.isActive

	const [updated] = await db
		.update(productVariants)
		.set(updates)
		.where(eq(productVariants.id, id))
		.returning()

	if (data.quantity !== undefined) {
		await db
			.update(inventory)
			.set({ quantity: data.quantity, updatedAt: new Date() })
			.where(eq(inventory.variantId, id))
	}

	return updated
}

export async function deleteVariant(id: string) {
	const workspace = await requireProductsPermission()

	// Verify variant's product belongs to this workspace
	const [variant] = await db
		.select({ id: productVariants.id })
		.from(productVariants)
		.innerJoin(products, eq(products.id, productVariants.productId))
		.where(and(eq(productVariants.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!variant) throw new Error("Variant not found")

	await db.delete(productVariants).where(eq(productVariants.id, id))
}

export async function bulkDeleteVariants(ids: string[]) {
	const workspace = await requireProductsPermission()

	// Only delete variants whose products belong to this workspace
	const validVariants = await db
		.select({ id: productVariants.id })
		.from(productVariants)
		.innerJoin(products, eq(products.id, productVariants.productId))
		.where(and(inArray(productVariants.id, ids), eq(products.workspaceId, workspace.id)))

	const validIds = validVariants.map((v) => v.id)
	if (validIds.length === 0) return

	await db.delete(productVariants).where(inArray(productVariants.id, validIds))
}
