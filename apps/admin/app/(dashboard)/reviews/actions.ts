"use server"

import { eq, and, desc, count, inArray, sql } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireReviewsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage reviews")
	}
	return workspace
}

async function getTestimonialsCollectionId(workspaceId: string) {
	const [collection] = await db
		.select({ id: contentCollections.id })
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.workspaceId, workspaceId),
				eq(contentCollections.slug, "testimonials")
			)
		)
		.limit(1)

	if (!collection) {
		throw new Error("Testimonials collection not found")
	}
	return collection.id
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

	const collectionId = await getTestimonialsCollectionId(workspace.id)

	const conditions = [
		eq(contentEntries.collectionId, collectionId),
		eq(contentEntries.workspaceId, workspace.id),
	]

	if (status && status !== "all") {
		conditions.push(
			sql`${contentEntries.data}->>'status' = ${status}`
		)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: contentEntries.id,
				data: contentEntries.data,
				isActive: contentEntries.isActive,
				createdAt: contentEntries.createdAt,
			})
			.from(contentEntries)
			.where(where)
			.orderBy(desc(contentEntries.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(contentEntries).where(where),
	])

	// Map contentEntries to review shape
	const mapped = items.map((item) => {
		const d = item.data as Record<string, unknown>
		return {
			id: item.id,
			reviewerName: (d.reviewerName as string) || "Unknown",
			reviewerEmail: (d.reviewerEmail as string) || null,
			rating: (d.rating as number) || 0,
			title: (d.title as string) || null,
			content: (d.content as string) || "",
			status: (d.status as string) || "pending",
			isFeatured: (d.isFeatured as boolean) || false,
			createdAt: item.createdAt,
		}
	})

	return { items: mapped, totalCount: Number(total.count) }
}

export async function getReview(id: string) {
	const workspace = await requireWorkspace()

	const [entry] = await db
		.select({
			id: contentEntries.id,
			data: contentEntries.data,
			isActive: contentEntries.isActive,
			createdAt: contentEntries.createdAt,
			updatedAt: contentEntries.updatedAt,
		})
		.from(contentEntries)
		.where(
			and(
				eq(contentEntries.id, id),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!entry) throw new Error("Review not found")

	const d = entry.data as Record<string, unknown>
	return {
		id: entry.id,
		reviewerName: (d.reviewerName as string) || "Unknown",
		reviewerEmail: (d.reviewerEmail as string) || null,
		rating: (d.rating as number) || 0,
		title: (d.title as string) || null,
		content: (d.content as string) || "",
		status: (d.status as string) || "pending",
		isFeatured: (d.isFeatured as boolean) || false,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	}
}

export async function moderateReview(id: string, status: "approved" | "rejected") {
	const workspace = await requireReviewsPermission()

	const [entry] = await db
		.select({ id: contentEntries.id, data: contentEntries.data })
		.from(contentEntries)
		.where(
			and(
				eq(contentEntries.id, id),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!entry) throw new Error("Review not found")

	const existingData = entry.data as Record<string, unknown>
	const updatedData = { ...existingData, status }

	await db
		.update(contentEntries)
		.set({ data: updatedData, updatedAt: new Date() })
		.where(eq(contentEntries.id, id))

	await logAudit({
		action: "product.updated",
		targetType: "review",
		targetId: id,
		metadata: { action: `review_${status}` },
	})

	return { id, status }
}

export async function toggleFeatured(id: string, isFeatured: boolean) {
	const workspace = await requireReviewsPermission()

	const [entry] = await db
		.select({ id: contentEntries.id, data: contentEntries.data })
		.from(contentEntries)
		.where(
			and(
				eq(contentEntries.id, id),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!entry) throw new Error("Review not found")

	const existingData = entry.data as Record<string, unknown>
	const updatedData = { ...existingData, isFeatured }

	await db
		.update(contentEntries)
		.set({ data: updatedData, updatedAt: new Date() })
		.where(eq(contentEntries.id, id))

	return { id, isFeatured }
}

export async function deleteReview(id: string) {
	const workspace = await requireReviewsPermission()

	const [entry] = await db
		.select({ id: contentEntries.id })
		.from(contentEntries)
		.where(
			and(
				eq(contentEntries.id, id),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!entry) throw new Error("Review not found")

	await db.delete(contentEntries).where(eq(contentEntries.id, id))

	await logAudit({
		action: "product.deleted",
		targetType: "review",
		targetId: id,
		metadata: { action: "review_deleted" },
	})
}

export async function bulkModerate(ids: string[], status: "approved" | "rejected") {
	const workspace = await requireReviewsPermission()

	const entries = await db
		.select({ id: contentEntries.id, data: contentEntries.data })
		.from(contentEntries)
		.where(
			and(
				inArray(contentEntries.id, ids),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)

	if (entries.length === 0) return

	for (const entry of entries) {
		const existingData = entry.data as Record<string, unknown>
		const updatedData = { ...existingData, status }
		await db
			.update(contentEntries)
			.set({ data: updatedData, updatedAt: new Date() })
			.where(eq(contentEntries.id, entry.id))
	}

	await logAudit({
		action: "product.updated",
		targetType: "review",
		metadata: { action: `bulk_${status}`, count: entries.length },
	})
}
