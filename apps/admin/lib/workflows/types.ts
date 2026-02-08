import type { Node, Edge } from "@xyflow/react"
import type { Workflow, WorkflowRun, WorkflowRunStep, WorkflowTrigger, WorkflowAction } from "@quickdash/db/schema"

// ============================================================================
// Event Payload Types - Data passed when triggers fire
// ============================================================================

export interface BaseEventData {
	workspaceId: string
	timestamp: string
}

export interface OrderEventData extends BaseEventData {
	orderId: string
	orderNumber: string
	status: string
	userId: string
	total: string
	subtotal: string
	items?: {
		productName: string
		variantName: string
		quantity: number
		unitPrice: string
	}[]
	customer?: {
		id: string
		email: string
		name: string
	}
}

export interface CustomerEventData extends BaseEventData {
	userId: string
	email: string
	name: string
	previousData?: Record<string, unknown>
	tagId?: string
	tagName?: string
}

export interface ProductEventData extends BaseEventData {
	productId: string
	name: string
	slug: string
	price: string
	previousData?: Record<string, unknown>
	// For stock-related events
	variantId?: string
	currentStock?: number
	threshold?: number
}

export interface SubscriptionEventData extends BaseEventData {
	subscriptionId: string
	userId: string
	status: string
	frequency: string
	pricePerDelivery: string
	customer?: {
		id: string
		email: string
		name: string
	}
	// For payment failed
	errorMessage?: string
}

export interface ReviewEventData extends BaseEventData {
	reviewId: string
	productId: string
	userId: string
	rating: number
	title?: string
	body?: string
	status: string
	product?: {
		id: string
		name: string
	}
	customer?: {
		id: string
		email: string
		name: string
	}
}

export interface AuctionEventData extends BaseEventData {
	auctionId: string
	productId: string
	status: string
	currentBid?: string
	bidCount?: number
	endTime?: string
	// For bid events
	bidderId?: string
	bidAmount?: string
}

export interface ScheduleEventData extends BaseEventData {
	scheduleId: string
	cronExpression?: string
	interval?: string
}

export interface ManualTriggerEventData extends BaseEventData {
	triggeredBy: string
	inputData?: Record<string, unknown>
}

export type WorkflowEventData =
	| OrderEventData
	| CustomerEventData
	| ProductEventData
	| SubscriptionEventData
	| ReviewEventData
	| AuctionEventData
	| ScheduleEventData
	| ManualTriggerEventData

// ============================================================================
// Action Configuration Types - Settings for each action type
// ============================================================================

export interface EmailSendConfig {
	to: string // Can use {{customer.email}}
	subject: string
	body: string
	replyTo?: string
}

export interface EmailSendTemplateConfig {
	to: string
	templateSlug: string
	variables?: Record<string, string>
}

export interface NotificationPushConfig {
	userId: string // Can use {{customer.id}}
	title: string
	body: string
	link?: string
	type?: string
}

export interface NotificationSmsConfig {
	phoneNumber: string
	message: string
}

export interface CustomerAddTagConfig {
	userId: string
	segmentId: string
}

export interface CustomerRemoveTagConfig {
	userId: string
	segmentId: string
}

export interface CustomerUpdateFieldConfig {
	userId: string
	field: string // Only certain fields allowed
	value: string
}

export interface OrderAddNoteConfig {
	orderId: string
	content: string
}

export interface OrderUpdateStatusConfig {
	orderId: string
	status: string
}

export interface ProductUpdateStockConfig {
	variantId: string
	operation: "set" | "increment" | "decrement"
	quantity: number
}

export interface WebhookSendConfig {
	url: string
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
	headers?: Record<string, string>
	body?: Record<string, unknown>
}

export interface SlackSendMessageConfig {
	webhookUrl: string
	message: string
	channel?: string
	username?: string
	iconEmoji?: string
}

export interface ConditionIfConfig {
	rules: ConditionRule[]
	logic: "and" | "or"
}

export interface ConditionRule {
	field: string // e.g., "order.total", "customer.email"
	operator: ConditionOperator
	value: string
}

export type ConditionOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "starts_with"
	| "ends_with"
	| "greater_than"
	| "less_than"
	| "greater_than_or_equal"
	| "less_than_or_equal"
	| "is_empty"
	| "is_not_empty"
	| "in_list"
	| "not_in_list"

export interface DelayWaitConfig {
	duration: number
	unit: "seconds" | "minutes" | "hours" | "days"
}

export interface DelayWaitUntilConfig {
	dateField: string // e.g., "order.createdAt"
	offset?: number // offset in minutes (+/-)
}

// Base action config - all action configs extend this
// Using a flexible base type to support the 70+ action handlers
// Individual handlers are strongly typed via their specific config interfaces
export type ActionConfig = Record<string, unknown>

// ============================================================================
// Execution Context - Runtime state during workflow execution
// ============================================================================

export interface WorkflowExecutionContext {
	// Identifiers
	workflowId: string
	workflowRunId: string
	workspaceId: string

	// Trigger data
	trigger: WorkflowTrigger
	triggerData: WorkflowEventData

	// Step outputs (keyed by node ID)
	stepOutputs: Record<string, ActionResult>

	// Derived data for easy access in templates
	order?: OrderEventData
	customer?: CustomerEventData
	product?: ProductEventData
	subscription?: SubscriptionEventData
	review?: ReviewEventData
	auction?: AuctionEventData
}

// ============================================================================
// Execution Results
// ============================================================================

export interface ActionResult {
	success: boolean
	output?: Record<string, unknown>
	error?: string
	skipped?: boolean
	skipReason?: string
}

export interface WorkflowExecutionResult {
	success: boolean
	runId: string
	stepsCompleted: number
	totalSteps: number
	error?: string
	output?: Record<string, unknown>
}

// ============================================================================
// Node Data Types - Data stored in React Flow nodes
// ============================================================================

export interface TriggerNodeData {
	label: string
	trigger: WorkflowTrigger
	category: string
	config?: Record<string, unknown>
}

export interface ActionNodeData {
	label: string
	action: WorkflowAction
	category: string
	config?: ActionConfig
}

export interface ConditionNodeData {
	label: string
	action: "condition.if"
	category: string
	config?: ConditionIfConfig
}

export interface DelayNodeData {
	label: string
	action: "delay.wait" | "delay.wait_until"
	category: string
	config?: DelayWaitConfig | DelayWaitUntilConfig
}

export type WorkflowNodeData = TriggerNodeData | ActionNodeData | ConditionNodeData | DelayNodeData

export type WorkflowNode = Node<Record<string, unknown>>
export type WorkflowEdge = Edge

// ============================================================================
// Inngest Event Types
// ============================================================================

export interface WorkflowTriggerEvent {
	name: "workflow/trigger"
	data: {
		trigger: WorkflowTrigger
		workspaceId: string
		eventData: WorkflowEventData
	}
}

export interface WorkflowManualTriggerEvent {
	name: "workflow/manual-trigger"
	data: {
		workflowId: string
		triggeredBy: string
		inputData?: Record<string, unknown>
	}
}

// ============================================================================
// Action Handler Type
// ============================================================================

export type ActionHandler<TConfig = ActionConfig> = (
	config: TConfig,
	context: WorkflowExecutionContext
) => Promise<ActionResult>
