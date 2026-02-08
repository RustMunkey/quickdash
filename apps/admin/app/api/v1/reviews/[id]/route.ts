/**
 * Admin API - Review Detail
 *
 * GET /api/v1/reviews/[id] - Get review
 * PATCH /api/v1/reviews/[id] - Moderate review (update status)
 * DELETE /api/v1/reviews/[id] - Delete review
 */

import { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { reviews, products, users } from "@quickdash/db/schema"
import {
	authenticateAdminApi,
	apiError,
	apiSuccess,
} from "@/lib/admin-api"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("readReviews")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [review] = await db
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
			.where(
				and(
					eq(reviews.id, id),
					eq(reviews.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!review) {
			return apiError("Review not found", "NOT_FOUND", 404)
		}

		return apiSuccess({ data: review })
	} catch (error) {
		console.error("Admin API - Get review error:", error)
		return apiError("Failed to get review", "INTERNAL_ERROR", 500)
	}
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeReviews")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const body = await request.json()

		// Verify review exists and belongs to workspace
		const [existing] = await db
			.select({ id: reviews.id })
			.from(reviews)
			.where(
				and(
					eq(reviews.id, id),
					eq(reviews.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Review not found", "NOT_FOUND", 404)
		}

		const updates: Record<string, unknown> = {}

		if (body.status !== undefined) {
			const validStatuses = ["pending", "approved", "rejected"]
			if (!validStatuses.includes(body.status)) {
				return apiError(
					`Invalid status. Must be one of: ${validStatuses.join(", ")}`,
					"VALIDATION_ERROR",
					400
				)
			}
			updates.status = body.status
			updates.moderatedAt = new Date()
		}

		if (Object.keys(updates).length === 0) {
			return apiError("No valid fields to update", "VALIDATION_ERROR", 400)
		}

		updates.updatedAt = new Date()

		const [review] = await db
			.update(reviews)
			.set(updates)
			.where(eq(reviews.id, id))
			.returning()

		return apiSuccess({ data: review })
	} catch (error) {
		console.error("Admin API - Moderate review error:", error)
		return apiError("Failed to moderate review", "INTERNAL_ERROR", 500)
	}
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
	const auth = await authenticateAdminApi("writeReviews")
	if (!auth.success) return auth.response

	const { id } = await params

	try {
		const [existing] = await db
			.select({ id: reviews.id })
			.from(reviews)
			.where(
				and(
					eq(reviews.id, id),
					eq(reviews.workspaceId, auth.workspace.id)
				)
			)
			.limit(1)

		if (!existing) {
			return apiError("Review not found", "NOT_FOUND", 404)
		}

		await db.delete(reviews).where(eq(reviews.id, id))

		return apiSuccess({ data: { id, deleted: true } })
	} catch (error) {
		console.error("Admin API - Delete review error:", error)
		return apiError("Failed to delete review", "INTERNAL_ERROR", 500)
	}
}
