import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, sql } from "@quickdash/db/drizzle"
import { reviews, users, orders, orderItems, productVariants } from "@quickdash/db/schema"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { verifyCustomerToken, extractBearerToken } from "@/lib/storefront-jwt"

/**
 * GET /api/storefront/reviews - Get reviews for a product
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)
	const productId = searchParams.get("productId")

	if (!productId) {
		return storefrontError("Missing productId query parameter", 400)
	}

	// Pagination
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")))
	const offset = (page - 1) * limit

	// Only show approved reviews
	const conditions = [
		eq(reviews.workspaceId, storefront.workspaceId),
		eq(reviews.productId, productId),
		eq(reviews.status, "approved"),
	]

	const [items, [countResult], [avgResult]] = await Promise.all([
		db
			.select({
				id: reviews.id,
				rating: reviews.rating,
				title: reviews.title,
				body: reviews.body,
				isVerifiedPurchase: reviews.isVerifiedPurchase,
				helpfulCount: reviews.helpfulCount,
				createdAt: reviews.createdAt,
				// User info (limited)
				userName: users.name,
				userImage: users.image,
			})
			.from(reviews)
			.innerJoin(users, eq(reviews.userId, users.id))
			.where(and(...conditions))
			.orderBy(desc(reviews.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(reviews)
			.where(and(...conditions)),
		db
			.select({
				avgRating: sql<number>`avg(${reviews.rating})`,
				totalReviews: sql<number>`count(*)`,
			})
			.from(reviews)
			.where(and(...conditions)),
	])

	const totalCount = Number(countResult.count)
	const totalPages = Math.ceil(totalCount / limit)

	return Response.json({
		reviews: items.map((r) => ({
			id: r.id,
			rating: r.rating,
			title: r.title,
			body: r.body,
			isVerifiedPurchase: r.isVerifiedPurchase,
			helpfulCount: r.helpfulCount,
			createdAt: r.createdAt,
			author: {
				name: r.userName,
				image: r.userImage,
			},
		})),
		summary: {
			averageRating: avgResult?.avgRating ? Math.round(Number(avgResult.avgRating) * 10) / 10 : null,
			totalReviews: Number(avgResult?.totalReviews || 0),
		},
		pagination: {
			page,
			limit,
			totalCount,
			totalPages,
			hasMore: page < totalPages,
		},
	})
}

/**
 * POST /api/storefront/reviews - Submit a review
 */
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	// Require auth
	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== storefront.id) {
		return storefrontError("Invalid or expired token", 401)
	}

	let body: {
		productId: string
		rating: number
		title?: string
		body?: string
	}
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { productId, rating, title, body: reviewBody } = body

	if (!productId || !rating) {
		return storefrontError("Missing required fields: productId, rating", 400)
	}

	if (rating < 1 || rating > 5) {
		return storefrontError("Rating must be between 1 and 5", 400)
	}

	// Check if user already reviewed this product
	const [existingReview] = await db
		.select({ id: reviews.id })
		.from(reviews)
		.where(
			and(
				eq(reviews.workspaceId, storefront.workspaceId),
				eq(reviews.productId, productId),
				eq(reviews.userId, payload.sub)
			)
		)
		.limit(1)

	if (existingReview) {
		return storefrontError("You have already reviewed this product", 409)
	}

	// Check if user has purchased this product (verified purchase)
	const purchaseCheck = await db
		.select({ id: orders.id })
		.from(orders)
		.innerJoin(orderItems, eq(orderItems.orderId, orders.id))
		.innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
		.where(
			and(
				eq(orders.workspaceId, storefront.workspaceId),
				eq(orders.userId, payload.sub),
				eq(productVariants.productId, productId),
				eq(orders.status, "delivered") // Only delivered orders count
			)
		)
		.limit(1)

	const isVerifiedPurchase = purchaseCheck.length > 0

	// Create review (pending approval)
	const [review] = await db
		.insert(reviews)
		.values({
			workspaceId: storefront.workspaceId,
			productId,
			userId: payload.sub,
			rating,
			title: title?.trim() || null,
			body: reviewBody?.trim() || null,
			status: "pending", // Requires moderation
			isVerifiedPurchase,
		})
		.returning()

	return Response.json({
		review: {
			id: review.id,
			rating: review.rating,
			title: review.title,
			body: review.body,
			status: review.status,
			isVerifiedPurchase: review.isVerifiedPurchase,
		},
		message: "Review submitted and pending approval",
	})
}

export const GET = withStorefrontAuth(handleGet)
export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
