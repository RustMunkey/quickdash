"use server"

import { eq, desc, asc, count, and, inArray, isNull, isNotNull } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { crmTasks, crmContacts } from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

interface GetTasksParams {
	page?: number
	pageSize?: number
	status?: string
	priority?: string
}

export async function getTasks(params: GetTasksParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status, priority } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(crmTasks.workspaceId, workspace.id)]
	if (status && status !== "all") {
		conditions.push(eq(crmTasks.status, status))
	}
	if (priority && priority !== "all") {
		conditions.push(eq(crmTasks.priority, priority))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: crmTasks.id,
				title: crmTasks.title,
				description: crmTasks.description,
				dueDate: crmTasks.dueDate,
				priority: crmTasks.priority,
				status: crmTasks.status,
				contactId: crmTasks.contactId,
				contactName: crmContacts.firstName,
				contactLastName: crmContacts.lastName,
				completedAt: crmTasks.completedAt,
				createdAt: crmTasks.createdAt,
			})
			.from(crmTasks)
			.leftJoin(crmContacts, eq(crmTasks.contactId, crmContacts.id))
			.where(where)
			.orderBy(asc(crmTasks.dueDate), desc(crmTasks.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(crmTasks).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function createTask(data: {
	title: string
	description?: string
	dueDate?: string
	priority?: string
	contactId?: string
}) {
	const workspace = await requireWorkspace()

	const [task] = await db
		.insert(crmTasks)
		.values({
			workspaceId: workspace.id,
			title: data.title,
			description: data.description || null,
			dueDate: data.dueDate ? new Date(data.dueDate) : null,
			priority: data.priority || "medium",
			contactId: data.contactId || null,
		})
		.returning()

	return task
}

export async function updateTaskStatus(id: string, status: string) {
	const workspace = await requireWorkspace()

	const updates: Record<string, unknown> = {
		status,
		updatedAt: new Date(),
	}
	if (status === "completed") {
		updates.completedAt = new Date()
	}

	await db
		.update(crmTasks)
		.set(updates)
		.where(and(eq(crmTasks.id, id), eq(crmTasks.workspaceId, workspace.id)))
}

export async function deleteTask(id: string) {
	const workspace = await requireWorkspace()
	await db
		.delete(crmTasks)
		.where(and(eq(crmTasks.id, id), eq(crmTasks.workspaceId, workspace.id)))
}

export async function bulkDeleteTasks(ids: string[]) {
	const workspace = await requireWorkspace()
	if (ids.length === 0) return
	await db
		.delete(crmTasks)
		.where(and(inArray(crmTasks.id, ids), eq(crmTasks.workspaceId, workspace.id)))
}
