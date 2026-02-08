import { inngest } from "@/lib/inngest"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workflows, workflowRuns, type Workflow } from "@quickdash/db/schema"
import { executeWorkflow } from "@/lib/workflows/executor"
import type { WorkflowTrigger } from "@quickdash/db/schema"
import type { WorkflowEventData, ManualTriggerEventData } from "@/lib/workflows/types"

// Helper to deserialize workflow dates from Inngest (dates become strings after serialization)
function deserializeWorkflow(w: unknown): Workflow {
	const raw = w as Record<string, unknown>
	return {
		...raw,
		createdAt: raw.createdAt ? new Date(raw.createdAt as string) : new Date(),
		updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : new Date(),
		lastRunAt: raw.lastRunAt ? new Date(raw.lastRunAt as string) : null,
	} as Workflow
}

/**
 * Main workflow trigger handler
 * Listens for "workflow/trigger" events and executes matching workflows
 */
export const workflowTriggerHandler = inngest.createFunction(
	{
		id: "workflow-trigger-handler",
		name: "Workflow Trigger Handler",
		concurrency: {
			limit: 5, // Max 5 concurrent executions per workspace
			key: "event.data.workspaceId",
		},
		retries: 3,
	},
	{ event: "workflow/trigger" },
	async ({ event, step }) => {
		const { trigger, workspaceId, eventData } = event.data as {
			trigger: WorkflowTrigger
			workspaceId: string
			eventData: WorkflowEventData
		}

		console.log("[Inngest] Workflow trigger handler called:", { trigger, workspaceId })

		// Find all active workflows matching this trigger and workspace
		const matchingWorkflows = await step.run("find-matching-workflows", async () => {
			const found = await db
				.select()
				.from(workflows)
				.where(
					and(
						eq(workflows.trigger, trigger),
						eq(workflows.workspaceId, workspaceId),
						eq(workflows.isActive, true)
					)
				)
			console.log("[Inngest] Found matching workflows:", found.length, found.map(w => ({ id: w.id, name: w.name })))
			return found
		})

		if (matchingWorkflows.length === 0) {
			console.log("[Inngest] No matching workflows found")
			return { executed: 0, message: "No matching workflows found" }
		}

		// Execute each matching workflow (deserialize dates after Inngest serialization)
		console.log("[Inngest] Executing", matchingWorkflows.length, "workflow(s)")
		const results = await Promise.all(
			matchingWorkflows.map(async (rawWorkflow) => {
				const workflow = deserializeWorkflow(rawWorkflow)
				console.log("[Inngest] Starting execution of workflow:", workflow.id, workflow.name)
				return step.run(`execute-workflow-${workflow.id}`, async () => {
					const result = await executeWorkflow({
						workflow,
						eventData,
						stepSleep: async (id, duration) => {
							// Convert duration to ms if string
							const ms =
								typeof duration === "string"
									? parseDurationToMs(duration)
									: duration
							await step.sleep(id, ms)
						},
					})
					console.log("[Inngest] Workflow execution complete:", workflow.id, result)
					return {
						workflowId: workflow.id,
						workflowName: workflow.name,
						...result,
					}
				})
			})
		)

		console.log("[Inngest] All workflows executed:", results)
		return {
			executed: results.length,
			results,
		}
	}
)

/**
 * Manual workflow trigger handler
 * Allows triggering a specific workflow manually
 */
export const workflowManualTriggerHandler = inngest.createFunction(
	{
		id: "workflow-manual-trigger",
		name: "Manual Workflow Trigger",
		retries: 2,
	},
	{ event: "workflow/manual-trigger" },
	async ({ event, step }) => {
		const { workflowId, triggeredBy, inputData = {} } = event.data as {
			workflowId: string
			triggeredBy: string
			inputData?: Record<string, unknown>
		}

		// Get the workflow
		const [rawWorkflow] = await step.run("get-workflow", async () => {
			return db
				.select()
				.from(workflows)
				.where(eq(workflows.id, workflowId))
				.limit(1)
		})

		if (!rawWorkflow) {
			throw new Error(`Workflow not found: ${workflowId}`)
		}

		const workflow = deserializeWorkflow(rawWorkflow)

		if (!workflow.isActive) {
			throw new Error(`Workflow is not active: ${workflowId}`)
		}

		// Check if it's a manual trigger workflow
		if (workflow.trigger !== "manual.trigger") {
			throw new Error(`Workflow is not a manual trigger workflow. Trigger: ${workflow.trigger}`)
		}

		// Build event data
		const eventData: ManualTriggerEventData = {
			workspaceId: workflow.workspaceId,
			timestamp: new Date().toISOString(),
			triggeredBy,
			inputData,
		}

		// Execute the workflow
		const result = await step.run("execute-workflow", async () => {
			return executeWorkflow({
				workflow,
				eventData,
				stepSleep: async (id, duration) => {
					const ms =
						typeof duration === "string" ? parseDurationToMs(duration) : duration
					await step.sleep(id, ms)
				},
			})
		})

		return {
			workflowId,
			workflowName: workflow.name,
			...result,
		}
	}
)

/**
 * Scheduled workflow handler
 * Runs on a cron schedule to check for scheduled workflows
 * Optimized: Reduced from every minute to every 5 minutes
 * Tradeoff: Scheduled workflows may have up to 5-minute delay
 */
export const workflowScheduleHandler = inngest.createFunction(
	{
		id: "workflow-schedule-check",
		name: "Workflow Schedule Check",
	},
	// Run every 5 minutes to check for scheduled workflows
	{ cron: "*/5 * * * *" },
	async ({ step }) => {
		// Find all active scheduled workflows
		const scheduledWorkflows = await step.run("find-scheduled-workflows", async () => {
			return db
				.select()
				.from(workflows)
				.where(
					and(
						eq(workflows.isActive, true),
						// Match both schedule types
						// Note: We check triggerConfig for cron expression
					)
				)
		})

		// Filter to only schedule triggers and deserialize
		const scheduleWorkflows = scheduledWorkflows
			.filter((w) => w.trigger === "schedule.cron" || w.trigger === "schedule.interval")
			.map((w) => deserializeWorkflow(w))

		if (scheduleWorkflows.length === 0) {
			return { checked: 0, executed: 0 }
		}

		const now = new Date()
		let executed = 0

		for (const workflow of scheduleWorkflows) {
			const config = workflow.triggerConfig as Record<string, unknown>

			// Check if workflow should run
			const shouldRun = checkSchedule(workflow.trigger as string, config, workflow.lastRunAt, now)

			if (shouldRun) {
				// Send event to trigger the workflow
				await inngest.send({
					name: "workflow/trigger",
					data: {
						trigger: workflow.trigger,
						workspaceId: workflow.workspaceId,
						eventData: {
							workspaceId: workflow.workspaceId,
							timestamp: now.toISOString(),
							scheduleId: workflow.id,
							cronExpression: config.cronExpression as string | undefined,
							interval: config.interval as string | undefined,
						},
					},
				})
				executed++
			}
		}

		return {
			checked: scheduleWorkflows.length,
			executed,
		}
	}
)

/**
 * Cancel a running workflow
 */
export const workflowCancelHandler = inngest.createFunction(
	{
		id: "workflow-cancel",
		name: "Cancel Workflow Run",
	},
	{ event: "workflow/cancel" },
	async ({ event, step }) => {
		const { runId } = event.data as { runId: string }

		await step.run("cancel-run", async () => {
			await db
				.update(workflowRuns)
				.set({
					status: "cancelled",
					completedAt: new Date(),
				})
				.where(eq(workflowRuns.id, runId))
		})

		return { cancelled: true, runId }
	}
)

// Helper functions

function parseDurationToMs(duration: string): number {
	const match = duration.match(/^(\d+)\s*(seconds?|minutes?|hours?|days?)$/i)
	if (!match) {
		return parseInt(duration, 10) || 1000
	}

	const [, amount, unit] = match
	const value = parseInt(amount, 10)

	switch (unit.toLowerCase().replace(/s$/, "")) {
		case "second":
			return value * 1000
		case "minute":
			return value * 60 * 1000
		case "hour":
			return value * 60 * 60 * 1000
		case "day":
			return value * 24 * 60 * 60 * 1000
		default:
			return value * 1000
	}
}

function checkSchedule(
	trigger: string,
	config: Record<string, unknown>,
	lastRunAt: Date | null,
	now: Date
): boolean {
	if (trigger === "schedule.interval") {
		const intervalMs = parseDurationToMs(config.interval as string || "1 hour")
		if (!lastRunAt) return true
		return now.getTime() - lastRunAt.getTime() >= intervalMs
	}

	if (trigger === "schedule.cron") {
		// For cron, we'd need a cron parser
		// For now, simple check: if last run was not in current minute
		if (!lastRunAt) return true
		return now.getMinutes() !== lastRunAt.getMinutes() || now.getHours() !== lastRunAt.getHours()
	}

	return false
}

// Export all handlers as an array for easy registration
export const workflowHandlers = [
	workflowTriggerHandler,
	workflowManualTriggerHandler,
	workflowScheduleHandler,
	workflowCancelHandler,
]
