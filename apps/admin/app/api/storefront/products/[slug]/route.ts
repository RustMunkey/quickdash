import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, inArray } from "@quickdash/db/drizzle"
import { products, categories, productVariants, inventory } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

// Check if string is a UUID
function isUUID(str: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
	return uuidRegex.test(str)
}

async function handleGet(
	request: NextRequest,
	storefront: StorefrontContext,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params

	// Support both slug and ID lookup
	const lookupField = isUUID(slug) ? products.id : products.slug

	// Get product by slug or ID
	const [product] = await db
		.select({
			id: products.id,
			name: products.name,
			slug: products.slug,
			description: products.description,
			shortDescription: products.shortDescription,
			price: products.price,
			compareAtPrice: products.compareAtPrice,
			images: products.images,
			thumbnail: products.thumbnail,
			isSubscribable: products.isSubscribable,
			isFeatured: products.isFeatured,
			weight: products.weight,
			weightUnit: products.weightUnit,
			metaTitle: products.metaTitle,
			metaDescription: products.metaDescription,
			categoryId: products.categoryId,
			categoryName: categories.name,
			categorySlug: categories.slug,
			tags: products.tags,
			createdAt: products.createdAt,
		})
		.from(products)
		.leftJoin(categories, eq(products.categoryId, categories.id))
		.where(
			and(
				eq(products.workspaceId, storefront.workspaceId),
				eq(lookupField, slug),
				eq(products.isActive, true)
			)
		)
		.limit(1)

	if (!product) {
		return storefrontError("Product not found", 404)
	}

	// Get variants
	const variants = await db
		.select({
			id: productVariants.id,
			name: productVariants.name,
			sku: productVariants.sku,
			price: productVariants.price,
			attributes: productVariants.attributes,
		})
		.from(productVariants)
		.where(
			and(
				eq(productVariants.productId, product.id),
				eq(productVariants.isActive, true)
			)
		)

	// Get inventory if storefront has permission
	let stock: { variantId: string; quantity: number }[] | null = null
	if (storefront.permissions.inventory && variants.length > 0) {
		const variantIds = variants.map((v) => v.id)
		const inventoryData = await db
			.select({
				variantId: inventory.variantId,
				quantity: inventory.quantity,
			})
			.from(inventory)
			.where(inArray(inventory.variantId, variantIds))

		stock = inventoryData.map((i) => ({
			variantId: i.variantId,
			quantity: i.quantity,
		}))
	}

	return Response.json({
		product: {
			id: product.id,
			name: product.name,
			slug: product.slug,
			description: product.description,
			shortDescription: product.shortDescription,
			price: product.price,
			compareAtPrice: product.compareAtPrice,
			images: product.images,
			thumbnail: product.thumbnail,
			isSubscribable: product.isSubscribable,
			isFeatured: product.isFeatured,
			weight: product.weight,
			weightUnit: product.weightUnit,
			meta: {
				title: product.metaTitle,
				description: product.metaDescription,
			},
			category: product.categoryId
				? { id: product.categoryId, name: product.categoryName, slug: product.categorySlug }
				: null,
			tags: product.tags,
			variants: variants.map((v) => ({
				id: v.id,
				name: v.name,
				sku: v.sku,
				price: v.price,
				attributes: v.attributes,
			})),
			stock,
			createdAt: product.createdAt,
		},
	})
}

export const GET = (request: NextRequest, context: { params: Promise<{ slug: string }> }) =>
	withStorefrontAuth(
		(req, storefront) => handleGet(req, storefront, context),
		{ requiredPermission: "products" }
	)(request)
export const OPTIONS = handleCorsOptions
