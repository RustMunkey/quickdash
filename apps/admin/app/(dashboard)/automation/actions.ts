"use server"

import { eq, and, desc, count, sql, asc, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { workflows, workflowRuns, workflowRunSteps } from "@quickdash/db/schema"
import type { Workflow, NewWorkflow, WorkflowRun, WorkflowTrigger, WorkflowAction } from "@quickdash/db/schema"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

// Permission check helper
async function requireAutomationPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage automations")
	}
	return workspace
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getWorkflows(params?: {
	page?: number
	pageSize?: number
	trigger?: WorkflowTrigger
	isActive?: boolean
}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, trigger, isActive } = params ?? {}
	const offset = (page - 1) * pageSize

	const conditions = [eq(workflows.workspaceId, workspace.id)]

	if (trigger) {
		conditions.push(eq(workflows.trigger, trigger))
	}

	if (isActive !== undefined) {
		conditions.push(eq(workflows.isActive, isActive))
	}

	const [items, [countResult]] = await Promise.all([
		db
			.select()
			.from(workflows)
			.where(and(...conditions))
			.orderBy(desc(workflows.updatedAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(workflows)
			.where(and(...conditions)),
	])

	return {
		items,
		totalCount: countResult.count,
	}
}

export async function getWorkflow(id: string) {
	const workspace = await requireWorkspace()

	const [workflow] = await db
		.select()
		.from(workflows)
		.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspace.id)))
		.limit(1)

	if (!workflow) {
		throw new Error("Workflow not found")
	}

	return workflow
}

export async function getWorkflowRuns(params?: {
	workflowId?: string
	page?: number
	pageSize?: number
	status?: "pending" | "running" | "completed" | "failed" | "cancelled"
}) {
	const workspace = await requireWorkspace()
	const { workflowId, page = 1, pageSize = 25, status } = params ?? {}
	const offset = (page - 1) * pageSize

	const conditions = [eq(workflowRuns.workspaceId, workspace.id)]

	if (workflowId) {
		conditions.push(eq(workflowRuns.workflowId, workflowId))
	}

	if (status) {
		conditions.push(eq(workflowRuns.status, status))
	}

	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: workflowRuns.id,
				workflowId: workflowRuns.workflowId,
				workflowName: workflows.name,
				triggerEvent: workflowRuns.triggerEvent,
				status: workflowRuns.status,
				stepsCompleted: workflowRuns.stepsCompleted,
				totalSteps: workflowRuns.totalSteps,
				error: workflowRuns.error,
				startedAt: workflowRuns.startedAt,
				completedAt: workflowRuns.completedAt,
				createdAt: workflowRuns.createdAt,
			})
			.from(workflowRuns)
			.innerJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
			.where(and(...conditions))
			.orderBy(desc(workflowRuns.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(workflowRuns)
			.where(and(...conditions)),
	])

	return {
		items,
		totalCount: countResult.count,
	}
}

export async function getWorkflowRunDetails(runId: string) {
	const workspace = await requireWorkspace()

	const [run] = await db
		.select()
		.from(workflowRuns)
		.where(
			and(eq(workflowRuns.id, runId), eq(workflowRuns.workspaceId, workspace.id))
		)
		.limit(1)

	if (!run) {
		throw new Error("Workflow run not found")
	}

	const steps = await db
		.select()
		.from(workflowRunSteps)
		.where(eq(workflowRunSteps.runId, runId))
		.orderBy(asc(workflowRunSteps.createdAt))

	return { run, steps }
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

export async function createWorkflow(data: {
	name: string
	description?: string
	trigger: WorkflowTrigger
	triggerConfig?: Record<string, unknown>
}) {
	const workspace = await requireAutomationPermission()
	const session = await auth.api.getSession({ headers: await headers() })

	const [workflow] = await db
		.insert(workflows)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description,
			trigger: data.trigger,
			triggerConfig: data.triggerConfig ?? {},
			nodes: [],
			edges: [],
			isDraft: true,
			isActive: false,
			createdBy: session?.user.id,
		})
		.returning()

	return workflow
}

export async function updateWorkflow(
	id: string,
	data: {
		name?: string
		description?: string
		trigger?: WorkflowTrigger
		triggerConfig?: Record<string, unknown>
		nodes?: unknown[]
		edges?: unknown[]
		isDraft?: boolean
	}
) {
	const workspace = await requireAutomationPermission()

	const [workflow] = await db
		.update(workflows)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspace.id)))
		.returning()

	if (!workflow) {
		throw new Error("Workflow not found")
	}

	return workflow
}

export async function toggleWorkflow(id: string, isActive: boolean) {
	const workspace = await requireAutomationPermission()

	const [workflow] = await db
		.update(workflows)
		.set({
			isActive,
			isDraft: false, // Activating a workflow marks it as not draft
			updatedAt: new Date(),
		})
		.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspace.id)))
		.returning()

	if (!workflow) {
		throw new Error("Workflow not found")
	}

	return workflow
}

export async function deleteWorkflow(id: string) {
	const workspace = await requireAutomationPermission()

	const [workflow] = await db
		.delete(workflows)
		.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspace.id)))
		.returning()

	if (!workflow) {
		throw new Error("Workflow not found")
	}

	return workflow
}

export async function bulkDeleteWorkflows(ids: string[]) {
	const workspace = await requireAutomationPermission()
	await db.delete(workflows).where(and(inArray(workflows.id, ids), eq(workflows.workspaceId, workspace.id)))
}

export async function bulkDeleteRuns(ids: string[]) {
	const workspace = await requireAutomationPermission()
	await db.delete(workflowRuns).where(and(inArray(workflowRuns.id, ids), eq(workflowRuns.workspaceId, workspace.id)))
}

export async function duplicateWorkflow(id: string) {
	const workspace = await requireAutomationPermission()
	const session = await auth.api.getSession({ headers: await headers() })

	const [original] = await db
		.select()
		.from(workflows)
		.where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspace.id)))
		.limit(1)

	if (!original) {
		throw new Error("Workflow not found")
	}

	const [copy] = await db
		.insert(workflows)
		.values({
			workspaceId: workspace.id,
			name: `${original.name} (Copy)`,
			description: original.description,
			trigger: original.trigger,
			triggerConfig: original.triggerConfig,
			nodes: original.nodes,
			edges: original.edges,
			isDraft: true,
			isActive: false,
			createdBy: session?.user.id,
		})
		.returning()

	return copy
}

