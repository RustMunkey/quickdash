import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import {
	workflows,
	workflowRuns,
	workflowRunSteps,
	type Workflow,
	type WorkflowAction,
} from "@quickdash/db/schema"
import type { Node, Edge } from "@xyflow/react"
import type {
	WorkflowExecutionContext,
	WorkflowExecutionResult,
	WorkflowEventData,
	WorkflowNode,
	WorkflowEdge,
	ActionResult,
	ActionConfig,
	ConditionIfConfig,
	DelayWaitConfig,
	DelayWaitUntilConfig,
	OrderEventData,
	CustomerEventData,
	ProductEventData,
	SubscriptionEventData,
	ReviewEventData,
	AuctionEventData,
} from "./types"
import { executeAction } from "./actions"
import { evaluateCondition } from "./condition-evaluator"
import { addHours, addMinutes, addDays, addSeconds, differenceInMilliseconds } from "date-fns"
import { pusherServer } from "@/lib/pusher-server"

export interface ExecuteWorkflowInput {
	workflow: Workflow
	eventData: WorkflowEventData
	// Inngest step helper for delays
	stepSleep?: (id: string, duration: string | number) => Promise<void>
}

// Broadcast workflow execution events to connected clients
async function broadcastExecutionEvent(
	workflowId: string,
	event: string,
	data: Record<string, unknown>
) {
	if (!pusherServer) {
		console.log("[Executor] Pusher not configured, skipping broadcast")
		return
	}
	try {
		console.log(`[Executor] Broadcasting to workflow-${workflowId}:`, event, data)
		await pusherServer.trigger(`workflow-${workflowId}`, event, data)
	} catch (e) {
		// Don't let Pusher errors break workflow execution
		console.error("[Executor] Pusher broadcast failed:", e)
	}
}

/**
 * Main workflow executor - traverses nodes and executes actions
 */
export async function executeWorkflow(input: ExecuteWorkflowInput): Promise<WorkflowExecutionResult> {
	const { workflow, eventData, stepSleep } = input

	// Create workflow run record
	const [run] = await db
		.insert(workflowRuns)
		.values({
			workflowId: workflow.id,
			workspaceId: workflow.workspaceId,
			triggerEvent: workflow.trigger,
			triggerData: eventData as unknown as Record<string, unknown>,
			status: "running",
			startedAt: new Date(),
		})
		.returning()

	// Build execution context
	const context: WorkflowExecutionContext = {
		workflowId: workflow.id,
		workflowRunId: run.id,
		workspaceId: workflow.workspaceId,
		trigger: workflow.trigger,
		triggerData: eventData,
		stepOutputs: {},
		// Convenience accessors
		...mapTriggerToContext(workflow.trigger, eventData),
	}

	const nodes = (workflow.nodes as WorkflowNode[]) || []
	const edges = (workflow.edges as WorkflowEdge[]) || []

	// Count total steps (excluding trigger)
	const totalSteps = nodes.filter((n) => n.type !== "trigger").length

	await db
		.update(workflowRuns)
		.set({ totalSteps })
		.where(eq(workflowRuns.id, run.id))

	let stepsCompleted = 0
	let lastError: string | undefined

	try {
		// Find trigger node
		const triggerNode = nodes.find((n) => n.type === "trigger")
		if (!triggerNode) {
			throw new Error("No trigger node found in workflow")
		}

		// Execute nodes starting from trigger
		await executeFromNode(triggerNode.id, nodes, edges, context, {
			stepSleep,
			runId: run.id,
			onStepComplete: () => {
				stepsCompleted++
			},
			onStepError: (error) => {
				lastError = error
			},
		})

		// Update run as completed
		await db
			.update(workflowRuns)
			.set({
				status: "completed",
				stepsCompleted,
				completedAt: new Date(),
				output: context.stepOutputs as Record<string, unknown>,
			})
			.where(eq(workflowRuns.id, run.id))

		// Update workflow stats
		await db
			.update(workflows)
			.set({
				runCount: workflow.runCount + 1,
				lastRunAt: new Date(),
				lastError: null,
			})
			.where(eq(workflows.id, workflow.id))

		// Broadcast workflow complete
		await broadcastExecutionEvent(workflow.id, "workflow-complete", {
			runId: run.id,
			status: "completed",
			stepsCompleted,
			totalSteps,
		})

		return {
			success: true,
			runId: run.id,
			stepsCompleted,
			totalSteps,
			output: context.stepOutputs,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"

		// Update run as failed
		await db
			.update(workflowRuns)
			.set({
				status: "failed",
				stepsCompleted,
				completedAt: new Date(),
				error: errorMessage,
			})
			.where(eq(workflowRuns.id, run.id))

		// Update workflow with error
		await db
			.update(workflows)
			.set({
				runCount: workflow.runCount + 1,
				lastRunAt: new Date(),
				lastError: errorMessage,
			})
			.where(eq(workflows.id, workflow.id))

		// Broadcast workflow failed
		await broadcastExecutionEvent(workflow.id, "workflow-complete", {
			runId: run.id,
			status: "failed",
			stepsCompleted,
			totalSteps,
			error: errorMessage,
		})

		return {
			success: false,
			runId: run.id,
			stepsCompleted,
			totalSteps,
			error: errorMessage,
		}
	}
}

interface ExecutionOptions {
	stepSleep?: (id: string, duration: string | number) => Promise<void>
	runId: string
	onStepComplete: () => void
	onStepError: (error: string) => void
}

/**
 * Execute workflow from a specific node, following edges
 */
async function executeFromNode(
	nodeId: string,
	nodes: WorkflowNode[],
	edges: WorkflowEdge[],
	context: WorkflowExecutionContext,
	options: ExecutionOptions
): Promise<void> {
	const node = nodes.find((n) => n.id === nodeId)
	if (!node) return

	// Skip trigger nodes (already handled)
	if (node.type === "trigger") {
		// Broadcast trigger execution
		await broadcastExecutionEvent(context.workflowId, "node-status", {
			nodeId,
			status: "executing",
			runId: options.runId,
		})
		await new Promise((r) => setTimeout(r, 200)) // Brief visual pause
		await broadcastExecutionEvent(context.workflowId, "node-status", {
			nodeId,
			status: "success",
			runId: options.runId,
		})

		// Follow edges from trigger
		const outgoingEdges = edges.filter((e) => e.source === nodeId)
		for (const edge of outgoingEdges) {
			// Broadcast edge activation
			await broadcastExecutionEvent(context.workflowId, "edge-active", {
				edgeId: edge.id,
				active: true,
				runId: options.runId,
			})
			await executeFromNode(edge.target, nodes, edges, context, options)
		}
		return
	}

	const nodeData = node.data as unknown as Record<string, unknown>
	const action = nodeData.action as WorkflowAction
	const config = (nodeData.config || {}) as unknown as ActionConfig

	// Broadcast node executing
	await broadcastExecutionEvent(context.workflowId, "node-status", {
		nodeId: node.id,
		status: "executing",
		runId: options.runId,
	})

	// Create step record
	const [step] = await db
		.insert(workflowRunSteps)
		.values({
			runId: options.runId,
			nodeId: node.id,
			action,
			actionConfig: config as unknown as Record<string, unknown>,
			status: "running",
			startedAt: new Date(),
			input: {
				nodeType: node.type,
				nodeLabel: nodeData.label,
			},
		})
		.returning()

	let result: ActionResult
	let nextEdgeHandle: string | null = null

	try {
		// Handle different node types
		if (node.type === "condition") {
			// Evaluate condition
			const conditionResult = evaluateCondition(config as unknown as ConditionIfConfig, context)
			result = conditionResult
			nextEdgeHandle = conditionResult.branch // "yes" or "no"
		} else if (node.type === "delay") {
			// Handle delays
			result = await handleDelay(node.id, config, context, options.stepSleep)
		} else {
			// Execute regular action
			result = await executeAction(action, config, context)
		}

		// Store result
		context.stepOutputs[node.id] = result

		// Update step record
		await db
			.update(workflowRunSteps)
			.set({
				status: result.success ? "completed" : "failed",
				output: result.output as Record<string, unknown> | undefined,
				error: result.error,
				completedAt: new Date(),
			})
			.where(eq(workflowRunSteps.id, step.id))

		// Broadcast step result
		await broadcastExecutionEvent(context.workflowId, "node-status", {
			nodeId: node.id,
			status: result.success ? "success" : "error",
			runId: options.runId,
			output: result.output,
			error: result.error,
		})

		if (result.success) {
			options.onStepComplete()
		} else {
			options.onStepError(result.error || "Unknown error")
			throw new Error(result.error || "Step failed")
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"

		// Broadcast error
		await broadcastExecutionEvent(context.workflowId, "node-status", {
			nodeId: node.id,
			status: "error",
			runId: options.runId,
			error: errorMessage,
		})

		await db
			.update(workflowRunSteps)
			.set({
				status: "failed",
				error: errorMessage,
				completedAt: new Date(),
			})
			.where(eq(workflowRunSteps.id, step.id))

		throw error
	}

	// Follow edges to next nodes
	let outgoingEdges = edges.filter((e) => e.source === nodeId)

	// For conditions, filter by source handle
	if (nextEdgeHandle) {
		outgoingEdges = outgoingEdges.filter(
			(e) => e.sourceHandle === nextEdgeHandle || e.sourceHandle === `${nextEdgeHandle}-handle`
		)
	}

	for (const edge of outgoingEdges) {
		// Broadcast edge activation
		await broadcastExecutionEvent(context.workflowId, "edge-active", {
			edgeId: edge.id,
			active: true,
			runId: options.runId,
		})
		await executeFromNode(edge.target, nodes, edges, context, options)
		// Deactivate edge after target node completes
		await broadcastExecutionEvent(context.workflowId, "edge-active", {
			edgeId: edge.id,
			active: false,
			runId: options.runId,
		})
	}
}

/**
 * Handle delay nodes
 */
async function handleDelay(
	nodeId: string,
	config: ActionConfig,
	context: WorkflowExecutionContext,
	stepSleep?: (id: string, duration: string | number) => Promise<void>
): Promise<ActionResult> {
	const delayConfig = config as unknown as DelayWaitConfig | DelayWaitUntilConfig

	// delay.wait - fixed duration
	if ("duration" in delayConfig && "unit" in delayConfig) {
		const { duration, unit } = delayConfig

		if (stepSleep) {
			// Use Inngest step.sleep for durable delays
			const durationString = `${duration} ${unit}`
			await stepSleep(`delay-${nodeId}`, durationString)
		} else {
			// Fallback to setTimeout (not recommended for production)
			const ms = convertToMs(duration, unit)
			await new Promise((resolve) => setTimeout(resolve, ms))
		}

		return {
			success: true,
			output: {
				delayed: true,
				duration,
				unit,
			},
		}
	}

	// delay.wait_until - wait until a specific time
	if ("dateField" in delayConfig) {
		const { dateField, offset = 0 } = delayConfig
		const targetDate = getDateFromContext(dateField, context)

		if (!targetDate) {
			return {
				success: false,
				error: `Could not resolve date field: ${dateField}`,
			}
		}

		// Apply offset
		const finalDate = addMinutes(targetDate, offset)
		const now = new Date()

		if (finalDate <= now) {
			// Already passed, continue immediately
			return {
				success: true,
				output: {
					delayed: false,
					reason: "Target time already passed",
					targetDate: finalDate.toISOString(),
				},
			}
		}

		if (stepSleep) {
			const ms = differenceInMilliseconds(finalDate, now)
			await stepSleep(`delay-until-${nodeId}`, ms)
		} else {
			const ms = differenceInMilliseconds(finalDate, now)
			await new Promise((resolve) => setTimeout(resolve, ms))
		}

		return {
			success: true,
			output: {
				delayed: true,
				targetDate: finalDate.toISOString(),
				offset,
			},
		}
	}

	return {
		success: false,
		error: "Invalid delay configuration",
	}
}

function convertToMs(duration: number, unit: "seconds" | "minutes" | "hours" | "days"): number {
	switch (unit) {
		case "seconds":
			return duration * 1000
		case "minutes":
			return duration * 60 * 1000
		case "hours":
			return duration * 60 * 60 * 1000
		case "days":
			return duration * 24 * 60 * 60 * 1000
		default:
			return duration * 1000
	}
}

function getDateFromContext(field: string, context: WorkflowExecutionContext): Date | null {
	// Try to get date from trigger data
	const parts = field.split(".")
	let value: unknown = context.triggerData

	for (const part of parts) {
		if (value && typeof value === "object") {
			value = (value as Record<string, unknown>)[part]
		} else {
			return null
		}
	}

	if (!value) return null
	if (value instanceof Date) return value
	if (typeof value === "string") return new Date(value)

	return null
}

/**
 * Map trigger type to convenience accessors
 */
function mapTriggerToContext(
	trigger: string,
	eventData: WorkflowEventData
): Partial<WorkflowExecutionContext> {
	if (trigger.startsWith("order.")) {
		return { order: eventData as OrderEventData }
	}
	if (trigger.startsWith("customer.")) {
		return { customer: eventData as CustomerEventData }
	}
	if (trigger.startsWith("product.")) {
		return { product: eventData as ProductEventData }
	}
	if (trigger.startsWith("subscription.")) {
		return { subscription: eventData as SubscriptionEventData }
	}
	if (trigger.startsWith("review.")) {
		return { review: eventData as ReviewEventData }
	}
	if (trigger.startsWith("auction.")) {
		return { auction: eventData as AuctionEventData }
	}
	return {}
}
