/**
 * Usage Metering
 *
 * Tracks consumption-based usage for automation, workflows, and API calls.
 * Usage persists (no monthly reset) — users only pay for what they use.
 *
 * Metrics:
 * - workflow_runs: Each workflow execution
 * - api_calls: Admin API requests
 * - automations: Scheduled/triggered automation events
 */

import { db } from "@quickdash/db/client"
import { eq, and, gte, sql } from "@quickdash/db/drizzle"
import { usageRecords } from "@quickdash/db/schema"

export type UsageMetric = "workflow_runs" | "api_calls" | "automations"

/**
 * Record a usage event.
 * Fire-and-forget: doesn't throw on failure (usage tracking shouldn't break the feature).
 */
export async function recordUsage(params: {
	userId: string
	workspaceId: string
	metric: UsageMetric
	quantity?: number
	metadata?: Record<string, unknown>
}): Promise<void> {
	try {
		await db.insert(usageRecords).values({
			userId: params.userId,
			workspaceId: params.workspaceId,
			metric: params.metric,
			quantity: params.quantity ?? 1,
			metadata: params.metadata ?? {},
		})
	} catch (error) {
		console.error("[Metering] Failed to record usage:", error)
	}
}

/**
 * Get usage summary for a user across all time.
 * Returns total counts per metric.
 */
export async function getUserUsageSummary(userId: string): Promise<Record<UsageMetric, number>> {
	const results = await db
		.select({
			metric: usageRecords.metric,
			total: sql<number>`sum(${usageRecords.quantity})::int`,
		})
		.from(usageRecords)
		.where(eq(usageRecords.userId, userId))
		.groupBy(usageRecords.metric)

	const summary: Record<UsageMetric, number> = {
		workflow_runs: 0,
		api_calls: 0,
		automations: 0,
	}

	for (const row of results) {
		if (row.metric in summary) {
			summary[row.metric as UsageMetric] = row.total || 0
		}
	}

	return summary
}

/**
 * Get usage summary for a workspace.
 */
export async function getWorkspaceUsageSummary(workspaceId: string): Promise<Record<UsageMetric, number>> {
	const results = await db
		.select({
			metric: usageRecords.metric,
			total: sql<number>`sum(${usageRecords.quantity})::int`,
		})
		.from(usageRecords)
		.where(eq(usageRecords.workspaceId, workspaceId))
		.groupBy(usageRecords.metric)

	const summary: Record<UsageMetric, number> = {
		workflow_runs: 0,
		api_calls: 0,
		automations: 0,
	}

	for (const row of results) {
		if (row.metric in summary) {
			summary[row.metric as UsageMetric] = row.total || 0
		}
	}

	return summary
}

/**
 * Get usage for a specific period (e.g. current month).
 */
export async function getUsageForPeriod(
	userId: string,
	since: Date
): Promise<Record<UsageMetric, number>> {
	const results = await db
		.select({
			metric: usageRecords.metric,
			total: sql<number>`sum(${usageRecords.quantity})::int`,
		})
		.from(usageRecords)
		.where(
			and(
				eq(usageRecords.userId, userId),
				gte(usageRecords.recordedAt, since)
			)
		)
		.groupBy(usageRecords.metric)

	const summary: Record<UsageMetric, number> = {
		workflow_runs: 0,
		api_calls: 0,
		automations: 0,
	}

	for (const row of results) {
		if (row.metric in summary) {
			summary[row.metric as UsageMetric] = row.total || 0
		}
	}

	return summary
}
