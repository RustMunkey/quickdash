"use server"

import { eq, and, desc, count, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { reviews, products, users } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { fireWebhooks } from "@/lib/webhooks/outgoing"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireReviewsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage reviews")
	}
	return workspace
}

interface GetReviewsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getReviews(params: GetReviewsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Filter reviews by workspace through products
	const conditions = [eq(products.workspaceId, workspace.id)]
	if (status && status !== "all") {
		conditions.push(eq(reviews.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: reviews.id,
				rating: reviews.rating,
				title: reviews.title,
				body: reviews.body,
				status: reviews.status,
				isVerifiedPurchase: reviews.isVerifiedPurchase,
				helpfulCount: reviews.helpfulCount,
				reportCount: reviews.reportCount,
				createdAt: reviews.createdAt,
				productName: products.name,
				productId: reviews.productId,
				customerName: users.name,
				customerEmail: users.email,
			})
			.from(reviews)
			.innerJoin(products, eq(reviews.productId, products.id))
			.leftJoin(users, eq(reviews.userId, users.id))
			.where(where)
			.orderBy(desc(reviews.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(reviews)
			.innerJoin(products, eq(reviews.productId, products.id))
			.where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function getReview(id: string) {
	const workspace = await requireWorkspace()

	const [review] = await db
		.select({
			id: reviews.id,
			rating: reviews.rating,
			title: reviews.title,
			body: reviews.body,
			status: reviews.status,
			isVerifiedPurchase: reviews.isVerifiedPurchase,
			helpfulCount: reviews.helpfulCount,
			reportCount: reviews.reportCount,
			moderatedAt: reviews.moderatedAt,
			createdAt: reviews.createdAt,
			productName: products.name,
			productId: reviews.productId,
			customerName: users.name,
			customerEmail: users.email,
		})
		.from(reviews)
		.innerJoin(products, eq(reviews.productId, products.id))
		.leftJoin(users, eq(reviews.userId, users.id))
		.where(and(eq(reviews.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!review) throw new Error("Review not found")
	return review
}

export async function moderateReview(id: string, status: "approved" | "rejected" | "reported") {
	const workspace = await requireReviewsPermission()

	// Verify review belongs to a product in this workspace
	const [existing] = await db
		.select({ id: reviews.id })
		.from(reviews)
		.innerJoin(products, eq(reviews.productId, products.id))
		.where(and(eq(reviews.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Review not found")

	const [review] = await db
		.update(reviews)
		.set({
			status,
			moderatedBy: workspace.ownerId,
			moderatedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(reviews.id, id))
		.returning()

	await logAudit({
		action: "product.updated",
		targetType: "review",
		targetId: id,
		metadata: { action: `review_${status}` },
	})

	// Fire webhook when review is approved
	if (status === "approved") {
		await fireWebhooks("review.approved", {
			reviewId: review.id,
			productId: review.productId,
			rating: review.rating,
			title: review.title,
			status: review.status,
			moderatedAt: review.moderatedAt?.toISOString(),
		}, workspace.id)
	}

	return review
}

export async function deleteReview(id: string) {
	const workspace = await requireReviewsPermission()

	// Verify review belongs to a product in this workspace
	const [existing] = await db
		.select({ id: reviews.id })
		.from(reviews)
		.innerJoin(products, eq(reviews.productId, products.id))
		.where(and(eq(reviews.id, id), eq(products.workspaceId, workspace.id)))
		.limit(1)

	if (!existing) throw new Error("Review not found")

	await db.delete(reviews).where(eq(reviews.id, id))

	await logAudit({
		action: "product.deleted",
		targetType: "review",
		targetId: id,
		metadata: { action: "review_deleted" },
	})
}

export async function bulkModerate(ids: string[], status: "approved" | "rejected") {
	const workspace = await requireReviewsPermission()

	// Get only reviews for products in this workspace
	const validReviews = await db
		.select({ id: reviews.id })
		.from(reviews)
		.innerJoin(products, eq(reviews.productId, products.id))
		.where(and(inArray(reviews.id, ids), eq(products.workspaceId, workspace.id)))

	const validIds = validReviews.map(r => r.id)
	if (validIds.length === 0) return

	await db
		.update(reviews)
		.set({
			status,
			moderatedBy: workspace.ownerId,
			moderatedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(inArray(reviews.id, validIds))

	await logAudit({
		action: "product.updated",
		targetType: "review",
		metadata: { action: `bulk_${status}`, count: validIds.length },
	})

	// Fire webhooks for approved reviews
	if (status === "approved") {
		for (const reviewId of validIds) {
			await fireWebhooks("review.approved", {
				reviewId,
				status,
				bulk: true,
			}, workspace.id)
		}
	}
}
