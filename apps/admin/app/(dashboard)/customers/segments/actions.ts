"use server"

import { eq, count, and, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { customerSegments, customerSegmentMembers, users } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireSegmentsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageCustomers")
	if (!canManage) {
		throw new Error("You don't have permission to manage segments")
	}
	return workspace
}

interface GetSegmentsParams {
	page?: number
	pageSize?: number
}

export async function getSegments(params: GetSegmentsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(customerSegments.workspaceId, workspace.id)

	const [segments, [total]] = await Promise.all([
		db
			.select()
			.from(customerSegments)
			.where(where)
			.orderBy(customerSegments.name)
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(customerSegments).where(where),
	])

	// Get member counts for this workspace's segments
	const segmentIds = segments.map((s) => s.id)
	const counts = segmentIds.length > 0
		? await db
				.select({
					segmentId: customerSegmentMembers.segmentId,
					count: count(),
				})
				.from(customerSegmentMembers)
				.where(
					and(
						eq(customerSegmentMembers.segmentId, customerSegmentMembers.segmentId),
						// Only count for segments we already filtered by workspace
					)
				)
				.groupBy(customerSegmentMembers.segmentId)
		: []

	const countMap = Object.fromEntries(counts.map((c) => [c.segmentId, Number(c.count)]))

	const items = segments.map((s) => ({
		...s,
		memberCount: countMap[s.id] ?? 0,
	}))

	return { items, totalCount: total.count }
}

export async function getSegment(id: string) {
	const workspace = await requireWorkspace()
	const [segment] = await db
		.select()
		.from(customerSegments)
		.where(and(eq(customerSegments.id, id), eq(customerSegments.workspaceId, workspace.id)))
		.limit(1)

	if (!segment) throw new Error("Segment not found")

	const members = await db
		.select({
			userId: customerSegmentMembers.userId,
			addedAt: customerSegmentMembers.addedAt,
			userName: users.name,
			userEmail: users.email,
		})
		.from(customerSegmentMembers)
		.innerJoin(users, eq(users.id, customerSegmentMembers.userId))
		.where(eq(customerSegmentMembers.segmentId, id))

	return { ...segment, members }
}

interface SegmentData {
	name: string
	description?: string
	type: string
	rules?: Array<{ field: string; operator: string; value: string }>
	color?: string
}

export async function createSegment(data: SegmentData) {
	const workspace = await requireSegmentsPermission()

	const [segment] = await db
		.insert(customerSegments)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description || null,
			type: data.type,
			rules: data.rules || null,
			color: data.color || "gray",
		})
		.returning()

	await logAudit({
		action: "segment.created",
		targetType: "segment",
		targetId: segment.id,
		targetLabel: segment.name,
	})

	return segment
}

export async function updateSegment(id: string, data: Partial<SegmentData>) {
	const workspace = await requireSegmentsPermission()

	const updates: Record<string, unknown> = { updatedAt: new Date() }
	if (data.name !== undefined) updates.name = data.name
	if (data.description !== undefined) updates.description = data.description || null
	if (data.type !== undefined) updates.type = data.type
	if (data.rules !== undefined) updates.rules = data.rules
	if (data.color !== undefined) updates.color = data.color

	const [segment] = await db
		.update(customerSegments)
		.set(updates)
		.where(and(eq(customerSegments.id, id), eq(customerSegments.workspaceId, workspace.id)))
		.returning()

	return segment
}

export async function deleteSegment(id: string) {
	const workspace = await requireSegmentsPermission()
	await db.delete(customerSegments).where(and(eq(customerSegments.id, id), eq(customerSegments.workspaceId, workspace.id)))
	await logAudit({
		action: "segment.deleted",
		targetType: "segment",
		targetId: id,
	})
}

export async function bulkDeleteSegments(ids: string[]) {
	const workspace = await requireSegmentsPermission()
	await db.delete(customerSegments).where(and(inArray(customerSegments.id, ids), eq(customerSegments.workspaceId, workspace.id)))
}

export async function addSegmentMember(segmentId: string, userId: string) {
	const workspace = await requireSegmentsPermission()
	// Verify segment belongs to this workspace
	const [segment] = await db
		.select({ id: customerSegments.id })
		.from(customerSegments)
		.where(and(eq(customerSegments.id, segmentId), eq(customerSegments.workspaceId, workspace.id)))
		.limit(1)
	if (!segment) throw new Error("Segment not found")
	await db.insert(customerSegmentMembers).values({ segmentId, userId })
}

export async function removeSegmentMember(segmentId: string, userId: string) {
	const workspace = await requireSegmentsPermission()
	// Verify segment belongs to this workspace
	const [segment] = await db
		.select({ id: customerSegments.id })
		.from(customerSegments)
		.where(and(eq(customerSegments.id, segmentId), eq(customerSegments.workspaceId, workspace.id)))
		.limit(1)
	if (!segment) throw new Error("Segment not found")
	await db
		.delete(customerSegmentMembers)
		.where(
			and(
				eq(customerSegmentMembers.segmentId, segmentId),
				eq(customerSegmentMembers.userId, userId)
			)
		)
}
