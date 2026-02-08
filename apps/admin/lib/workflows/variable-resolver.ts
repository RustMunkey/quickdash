import type { WorkflowExecutionContext } from "./types"

/**
 * Resolve template variables in a string
 * Supports: {{order.total}}, {{customer.email}}, {{stepOutputs.nodeId.field}}
 */
export function resolveVariables(template: string, context: WorkflowExecutionContext): string {
	if (!template || typeof template !== "string") return template

	// Match {{variable.path}} patterns
	const variablePattern = /\{\{([^}]+)\}\}/g

	return template.replace(variablePattern, (match, path: string) => {
		const value = getValueFromPath(path.trim(), context)
		if (value === undefined || value === null) return ""
		return String(value)
	})
}

/**
 * Recursively resolve variables in an object or array
 */
export function resolveConfigVariables<T>(
	config: T,
	context: WorkflowExecutionContext
): T {
	if (config === null || config === undefined) return config

	if (typeof config === "string") {
		return resolveVariables(config, context) as T
	}

	if (Array.isArray(config)) {
		return config.map((item) => resolveConfigVariables(item, context)) as T
	}

	if (typeof config === "object") {
		const resolved: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(config)) {
			resolved[key] = resolveConfigVariables(value, context)
		}
		return resolved as T
	}

	return config
}

/**
 * Get a value from a nested path in the context
 * Supports: order.total, customer.email, triggerData.items[0].productName, stepOutputs.node1.result
 */
function getValueFromPath(path: string, context: WorkflowExecutionContext): unknown {
	const parts = path.split(".")
	const root = parts[0]

	// Map root to context property
	let current: unknown

	switch (root) {
		case "order":
			current = context.order || context.triggerData
			parts.shift() // Remove 'order' from path
			break

		case "customer":
			current = context.customer || (context.triggerData as unknown as Record<string, unknown>)?.customer
			parts.shift()
			break

		case "product":
			current = context.product || context.triggerData
			parts.shift()
			break

		case "subscription":
			current = context.subscription || context.triggerData
			parts.shift()
			break

		case "review":
			current = context.review || context.triggerData
			parts.shift()
			break

		case "auction":
			current = context.auction || context.triggerData
			parts.shift()
			break

		case "triggerData":
			current = context.triggerData
			parts.shift()
			break

		case "stepOutputs":
			current = context.stepOutputs
			parts.shift()
			break

		case "workflow":
			current = { id: context.workflowId, runId: context.workflowRunId }
			parts.shift()
			break

		case "workspace":
			current = { id: context.workspaceId }
			parts.shift()
			break

		default:
			// Try direct access on triggerData
			current = context.triggerData
	}

	// Navigate the remaining path
	for (const part of parts) {
		if (current === null || current === undefined) return undefined

		// Handle array index syntax: items[0]
		const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
		if (arrayMatch) {
			const [, key, indexStr] = arrayMatch
			const index = parseInt(indexStr, 10)
			const obj = current as Record<string, unknown>
			const array = obj[key]
			if (Array.isArray(array)) {
				current = array[index]
			} else {
				return undefined
			}
		} else {
			current = (current as Record<string, unknown>)[part]
		}
	}

	return current
}

/**
 * Check if a string contains template variables
 */
export function hasVariables(str: string): boolean {
	if (!str || typeof str !== "string") return false
	return /\{\{[^}]+\}\}/.test(str)
}

/**
 * Extract all variable paths from a template string
 */
export function extractVariables(template: string): string[] {
	if (!template || typeof template !== "string") return []

	const variablePattern = /\{\{([^}]+)\}\}/g
	const variables: string[] = []
	let match: RegExpExecArray | null

	while ((match = variablePattern.exec(template)) !== null) {
		variables.push(match[1].trim())
	}

	return variables
}

/**
 * Validate that all required variables in a template can be resolved
 */
export function validateVariables(
	template: string,
	context: WorkflowExecutionContext
): { valid: boolean; missing: string[] } {
	const variables = extractVariables(template)
	const missing: string[] = []

	for (const variable of variables) {
		const value = getValueFromPath(variable, context)
		if (value === undefined) {
			missing.push(variable)
		}
	}

	return {
		valid: missing.length === 0,
		missing,
	}
}
