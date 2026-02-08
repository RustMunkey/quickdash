// Main exports for the workflow execution engine

// Types
export * from "./types"

// Core functions
export { executeWorkflow, type ExecuteWorkflowInput } from "./executor"
export { evaluateCondition, describeCondition, describeRule } from "./condition-evaluator"
export {
	resolveVariables,
	resolveConfigVariables,
	hasVariables,
	extractVariables,
	validateVariables,
} from "./variable-resolver"

// Action handlers
export {
	executeAction,
	hasActionHandler,
	getSupportedActions,
	getActionCount,
} from "./actions"

// Workspace integrations (BYOK)
export {
	getWorkspaceIntegration,
	getOAuthCredentials,
	getApiKeyCredentials,
	getWebhookCredentials,
	logIntegrationUsage,
	markIntegrationError,
	clearIntegrationError,
	hasIntegration,
	getWorkspaceIntegrations,
	INTEGRATION_METADATA,
} from "./integrations"

// Event emission
export {
	emitWorkflowEvent,
	emitOrderEvent,
	emitOrderCreated,
	emitOrderPaid,
	emitOrderFulfilled,
	emitOrderCancelled,
	emitOrderRefunded,
	emitCustomerEvent,
	emitCustomerCreated,
	emitCustomerUpdated,
	emitCustomerTagAdded,
	emitProductEvent,
	emitProductCreated,
	emitProductUpdated,
	emitProductLowStock,
	emitProductOutOfStock,
	emitSubscriptionEvent,
	emitSubscriptionCreated,
	emitSubscriptionRenewed,
	emitSubscriptionCancelled,
	emitSubscriptionPaymentFailed,
	emitReviewEvent,
	emitReviewCreated,
	emitReviewApproved,
	emitReviewReported,
	emitAuctionEvent,
	emitAuctionStarted,
	emitAuctionBidPlaced,
	emitAuctionEndingSoon,
	emitAuctionEnded,
	triggerWorkflowManually,
	cancelWorkflowRun,
} from "./events"
