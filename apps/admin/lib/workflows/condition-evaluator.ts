import type {
	ConditionIfConfig,
	ConditionRule,
	ConditionOperator,
	WorkflowExecutionContext,
	ActionResult,
} from "./types"
import { resolveVariables } from "./variable-resolver"

/**
 * Evaluate a condition node and return which branch to follow
 */
export function evaluateCondition(
	config: ConditionIfConfig,
	context: WorkflowExecutionContext
): ActionResult & { branch: "yes" | "no" } {
	try {
		const { rules, logic } = config

		if (!rules || rules.length === 0) {
			// No rules = always true
			return { success: true, branch: "yes", output: { result: true, reason: "no rules" } }
		}

		const results = rules.map((rule) => evaluateRule(rule, context))
		const passed = logic === "and" ? results.every((r) => r) : results.some((r) => r)

		return {
			success: true,
			branch: passed ? "yes" : "no",
			output: {
				result: passed,
				logic,
				ruleResults: results,
			},
		}
	} catch (error) {
		return {
			success: false,
			branch: "no",
			error: error instanceof Error ? error.message : "Condition evaluation failed",
		}
	}
}

/**
 * Evaluate a single rule
 */
function evaluateRule(rule: ConditionRule, context: WorkflowExecutionContext): boolean {
	const { field, operator, value: expectedValue } = rule

	// Resolve the field value from context
	const actualValue = resolveVariables(`{{${field}}}`, context)

	// Resolve the expected value (in case it contains variables)
	const resolvedExpected = resolveVariables(expectedValue, context)

	return compareValues(actualValue, operator, resolvedExpected)
}

/**
 * Compare two values with an operator
 */
function compareValues(
	actual: string,
	operator: ConditionOperator,
	expected: string
): boolean {
	// Normalize for comparison
	const actualNorm = actual?.toString().toLowerCase().trim() ?? ""
	const expectedNorm = expected?.toString().toLowerCase().trim() ?? ""

	switch (operator) {
		case "equals":
			return actualNorm === expectedNorm

		case "not_equals":
			return actualNorm !== expectedNorm

		case "contains":
			return actualNorm.includes(expectedNorm)

		case "not_contains":
			return !actualNorm.includes(expectedNorm)

		case "starts_with":
			return actualNorm.startsWith(expectedNorm)

		case "ends_with":
			return actualNorm.endsWith(expectedNorm)

		case "greater_than":
			return parseFloat(actual) > parseFloat(expected)

		case "less_than":
			return parseFloat(actual) < parseFloat(expected)

		case "greater_than_or_equal":
			return parseFloat(actual) >= parseFloat(expected)

		case "less_than_or_equal":
			return parseFloat(actual) <= parseFloat(expected)

		case "is_empty":
			return actualNorm === "" || actual === null || actual === undefined

		case "is_not_empty":
			return actualNorm !== "" && actual !== null && actual !== undefined

		case "in_list": {
			// Expected is comma-separated list
			const list = expectedNorm.split(",").map((s) => s.trim())
			return list.includes(actualNorm)
		}

		case "not_in_list": {
			const list = expectedNorm.split(",").map((s) => s.trim())
			return !list.includes(actualNorm)
		}

		default:
			return false
	}
}

/**
 * Get a human-readable description of a rule
 */
export function describeRule(rule: ConditionRule): string {
	const operatorLabels: Record<ConditionOperator, string> = {
		equals: "equals",
		not_equals: "does not equal",
		contains: "contains",
		not_contains: "does not contain",
		starts_with: "starts with",
		ends_with: "ends with",
		greater_than: "is greater than",
		less_than: "is less than",
		greater_than_or_equal: "is at least",
		less_than_or_equal: "is at most",
		is_empty: "is empty",
		is_not_empty: "is not empty",
		in_list: "is one of",
		not_in_list: "is not one of",
	}

	const operatorLabel = operatorLabels[rule.operator] || rule.operator

	if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
		return `${rule.field} ${operatorLabel}`
	}

	return `${rule.field} ${operatorLabel} "${rule.value}"`
}

/**
 * Get a human-readable description of a condition config
 */
export function describeCondition(config: ConditionIfConfig): string {
	if (!config.rules || config.rules.length === 0) {
		return "Always true (no conditions)"
	}

	const ruleDescriptions = config.rules.map(describeRule)
	const connector = config.logic === "and" ? " AND " : " OR "

	return ruleDescriptions.join(connector)
}
