/**
 * Admin API - Reviews
 *
 * GET /api/v1/reviews - List reviews
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, asc, count } from "@quickdash/db/drizzle"
import { reviews, products, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
	getPaginationParams,
	buildPaginationMeta,
} from "@/lib/admin-api"

export async function GET(request: NextRequest) {
	const auth = await authenticateAdminApi("readReviews")
	if (!auth.success) return auth.response

	const { searchParams } = new URL(request.url)
	const { page, limit, offset } = getPaginationParams(searchParams)

	const status = searchParams.get("status") // pending, approved, rejected
	const productId = searchParams.get("product_id")
	const sortBy = searchParams.get("sort_by") || "createdAt"
	const sortOrder = searchParams.get("sort_order") || "desc"

	try {
		const conditions = [eq(reviews.workspaceId, auth.workspace.id)]

		if (status) {
			conditions.push(eq(reviews.status, status))
		}
		if (productId) {
			conditions.push(eq(reviews.productId, productId))
		}

		// Get total count
		const [{ total }] = await db
			.select({ total: count() })
			.from(reviews)
			.where(and(...conditions))

		// Get reviews with product and reviewer info
		const orderFn = sortOrder === "asc" ? asc : desc
		const sortColumn =
			sortBy === "rating"
				? reviews.rating
				: sortBy === "updatedAt"
					? reviews.updatedAt
					: reviews.createdAt

		const reviewList = await db
			.select({
				id: reviews.id,
				productId: reviews.productId,
				productName: products.name,
				userId: reviews.userId,
				reviewerName: users.name,
				reviewerEmail: users.email,
				variantId: reviews.variantId,
				rating: reviews.rating,
				title: reviews.title,
				body: reviews.body,
				status: reviews.status,
				moderatedBy: reviews.moderatedBy,
				moderatedAt: reviews.moderatedAt,
				isVerifiedPurchase: reviews.isVerifiedPurchase,
				helpfulCount: reviews.helpfulCount,
				reportCount: reviews.reportCount,
				createdAt: reviews.createdAt,
				updatedAt: reviews.updatedAt,
			})
			.from(reviews)
			.leftJoin(products, eq(reviews.productId, products.id))
			.leftJoin(users, eq(reviews.userId, users.id))
			.where(and(...conditions))
			.orderBy(orderFn(sortColumn))
			.limit(limit)
			.offset(offset)

		return apiSuccess({
			data: reviewList,
			meta: buildPaginationMeta(Number(total), page, limit),
		})
	} catch (error) {
		console.error("Admin API - List reviews error:", error)
		return apiError("Failed to list reviews", "INTERNAL_ERROR", 500)
	}
}
