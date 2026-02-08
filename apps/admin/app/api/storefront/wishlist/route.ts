import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { wishlists, products } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { verifyCustomerToken, extractBearerToken } from "@/lib/storefront-jwt"

/**
 * Verify customer auth and return user ID
 */
async function requireCustomer(request: NextRequest, storefront: StorefrontContext): Promise<{ userId: string } | { error: string }> {
	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return { error: "Missing Authorization header" }
	}

	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== storefront.id) {
		return { error: "Invalid or expired token" }
	}

	return { userId: payload.sub }
}

/**
 * GET /api/storefront/wishlist - Get customer's wishlist
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const auth = await requireCustomer(request, storefront)
	if ("error" in auth) {
		return storefrontError(auth.error, 401)
	}

	const items = await db
		.select({
			id: wishlists.id,
			productId: wishlists.productId,
			createdAt: wishlists.createdAt,
			// Product details
			productName: products.name,
			productSlug: products.slug,
			productPrice: products.price,
			productThumbnail: products.thumbnail,
			productImages: products.images,
			productIsActive: products.isActive,
		})
		.from(wishlists)
		.innerJoin(products, eq(wishlists.productId, products.id))
		.where(
			and(
				eq(wishlists.workspaceId, storefront.workspaceId),
				eq(wishlists.userId, auth.userId)
			)
		)
		.orderBy(wishlists.createdAt)

	return Response.json({
		wishlist: items.map((item) => ({
			id: item.id,
			addedAt: item.createdAt,
			product: {
				id: item.productId,
				name: item.productName,
				slug: item.productSlug,
				price: item.productPrice,
				thumbnail: item.productThumbnail,
				images: item.productImages,
				isActive: item.productIsActive,
			},
		})),
	})
}

/**
 * POST /api/storefront/wishlist - Add product to wishlist
 */
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const auth = await requireCustomer(request, storefront)
	if ("error" in auth) {
		return storefrontError(auth.error, 401)
	}

	let body: { productId: string }
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	if (!body.productId) {
		return storefrontError("Missing productId", 400)
	}

	// Verify product exists and belongs to this workspace
	const [product] = await db
		.select({ id: products.id })
		.from(products)
		.where(
			and(
				eq(products.id, body.productId),
				eq(products.workspaceId, storefront.workspaceId)
			)
		)
		.limit(1)

	if (!product) {
		return storefrontError("Product not found", 404)
	}

	// Add to wishlist (ignore if already exists)
	try {
		await db
			.insert(wishlists)
			.values({
				workspaceId: storefront.workspaceId,
				userId: auth.userId,
				productId: body.productId,
			})
			.onConflictDoNothing()
	} catch {
		// Already exists, that's fine
	}

	return Response.json({ success: true })
}

/**
 * DELETE /api/storefront/wishlist - Remove product from wishlist
 */
async function handleDelete(request: NextRequest, storefront: StorefrontContext) {
	const auth = await requireCustomer(request, storefront)
	if ("error" in auth) {
		return storefrontError(auth.error, 401)
	}

	const { searchParams } = new URL(request.url)
	const productId = searchParams.get("productId")

	if (!productId) {
		return storefrontError("Missing productId query parameter", 400)
	}

	await db
		.delete(wishlists)
		.where(
			and(
				eq(wishlists.workspaceId, storefront.workspaceId),
				eq(wishlists.userId, auth.userId),
				eq(wishlists.productId, productId)
			)
		)

	return Response.json({ success: true })
}

export const GET = withStorefrontAuth(handleGet)
export const POST = withStorefrontAuth(handlePost)
export const DELETE = withStorefrontAuth(handleDelete)
export const OPTIONS = handleCorsOptions
