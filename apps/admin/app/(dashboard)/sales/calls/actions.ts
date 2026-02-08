"use server"

import { eq, desc, count, and, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { calls, callParticipants, workspaceMembers, users } from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

export async function bulkDeleteCalls(ids: string[]) {
	const workspace = await requireWorkspace()
	const members = await db
		.select({ userId: workspaceMembers.userId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspace.id))
	const memberIds = members.map((m) => m.userId)
	if (memberIds.length === 0) return
	await db.delete(calls).where(and(inArray(calls.id, ids), inArray(calls.initiatorId, memberIds)))
}

export async function getCalls(params: { page?: number; pageSize?: number; status?: string } = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Get workspace member user IDs
	const members = await db
		.select({ userId: workspaceMembers.userId })
		.from(workspaceMembers)
		.where(eq(workspaceMembers.workspaceId, workspace.id))

	const memberIds = members.map((m) => m.userId)
	if (memberIds.length === 0) {
		return { items: [], totalCount: 0 }
	}

	const conditions = [inArray(calls.initiatorId, memberIds)]
	if (status && status !== "all") {
		conditions.push(eq(calls.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: calls.id,
				type: calls.type,
				status: calls.status,
				isGroup: calls.isGroup,
				startedAt: calls.startedAt,
				endedAt: calls.endedAt,
				createdAt: calls.createdAt,
				endReason: calls.endReason,
				durationSeconds: calls.durationSeconds,
				initiatorId: calls.initiatorId,
				initiatorName: users.name,
			})
			.from(calls)
			.innerJoin(users, eq(calls.initiatorId, users.id))
			.where(where)
			.orderBy(desc(calls.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(calls).where(where),
	])

	return { items, totalCount: Number(total.count) }
}
