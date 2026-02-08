/**
 * Admin API - Single Product
 *
 * GET /api/v1/products/:id - Get product
 * PATCH /api/v1/products/:id - Update product
 * DELETE /api/v1/products/:id - Delete product
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { products, categories, productVariants } from "@quickdash/db/schema"
import { authenticateAdminApi, apiError, apiSuccess } from "@/lib/admin-api"
import { fireWebhooks } from "@/lib/webhooks/outgoing"

interface RouteParams {
	params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("readProducts")
	if (!auth.success) return auth.response

	try {
		// Get product with category
		const [product] = await db
			.select({
				id: products.id,
				name: products.name,
				slug: products.slug,
				description: products.description,
				shortDescription: products.shortDescription,
				price: products.price,
				compareAtPrice: products.compareAtPrice,
				costPrice: products.costPrice,
				isActive: products.isActive,
				isFeatured: products.isFeatured,
				isSubscribable: products.isSubscribable,
				images: products.images,
				thumbnail: products.thumbnail,
				categoryId: products.categoryId,
				categoryName: categories.name,
				tags: products.tags,
				weight: products.weight,
				weightUnit: products.weightUnit,
				metaTitle: products.metaTitle,
				metaDescription: products.metaDescription,
				createdAt: products.createdAt,
				updatedAt: products.updatedAt,
			})
			.from(products)
			.leftJoin(categories, eq(products.categoryId, categories.id))
			.where(and(eq(products.id, id), eq(products.workspaceId, auth.workspace.id)))
			.limit(1)

		if (!product) {
			return apiError("Product not found", "NOT_FOUND", 404)
		}

		// Get variants
		const variants = await db
			.select()
			.from(productVariants)
			.where(eq(productVariants.productId, id))

		return apiSuccess({
			data: {
				...product,
				variants,
			},
		})
	} catch (error) {
		console.error("Admin API - Get product error:", error)
		return apiError("Failed to get product", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	try {
		// Verify ownership
		const [existing] = await db
			.select({ id: products.id })
			.from(products)
			.where(and(eq(products.id, id), eq(products.workspaceId, auth.workspace.id)))
			.limit(1)

		if (!existing) {
			return apiError("Product not found", "NOT_FOUND", 404)
		}

		const body = await request.json()

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		}

		const allowedFields = [
			"name", "slug", "description", "shortDescription", "price", "compareAtPrice", "costPrice",
			"isActive", "isFeatured", "isSubscribable", "images", "thumbnail", "categoryId", "tags",
			"weight", "weightUnit", "metaTitle", "metaDescription"
		]

		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				if (field === "price" || field === "compareAtPrice" || field === "costPrice" || field === "weight") {
					updateData[field] = body[field] !== null ? String(body[field]) : null
				} else {
					updateData[field] = body[field]
				}
			}
		}

		// Update product
		const [updated] = await db
			.update(products)
			.set(updateData)
			.where(eq(products.id, id))
			.returning()

		// Fire webhook
		fireWebhooks("product.updated", { product: updated }, auth.workspace.id)

		return apiSuccess({ data: updated })
	} catch (error) {
		console.error("Admin API - Update product error:", error)
		return apiError("Failed to update product", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const { id } = await params

	// Authenticate
	const auth = await authenticateAdminApi("writeProducts")
	if (!auth.success) return auth.response

	try {
		// Verify ownership and get product data for webhook
		const [product] = await db
			.select()
			.from(products)
			.where(and(eq(products.id, id), eq(products.workspaceId, auth.workspace.id)))
			.limit(1)

		if (!product) {
			return apiError("Product not found", "NOT_FOUND", 404)
		}

		// Delete product (cascade will handle variants)
		await db.delete(products).where(eq(products.id, id))

		// Fire webhook
		fireWebhooks("product.deleted", { product }, auth.workspace.id)

		return apiSuccess({ message: "Product deleted successfully" })
	} catch (error) {
		console.error("Admin API - Delete product error:", error)
		return apiError("Failed to delete product", "INTERNAL_ERROR", 500)
	}
}
