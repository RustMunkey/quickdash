import { inngest } from "@/lib/inngest"
import type { WorkflowTrigger } from "@quickdash/db/schema"
import type {
	WorkflowEventData,
	OrderEventData,
	CustomerEventData,
	ProductEventData,
	SubscriptionEventData,
	ReviewEventData,
	AuctionEventData,
} from "./types"

/**
 * Emit a workflow event to Inngest
 * This will trigger any workflows that match the event
 */
export async function emitWorkflowEvent(
	trigger: WorkflowTrigger,
	workspaceId: string,
	eventData: Omit<WorkflowEventData, "workspaceId" | "timestamp">
): Promise<void> {
	await inngest.send({
		name: "workflow/trigger",
		data: {
			trigger,
			workspaceId,
			eventData: {
				...eventData,
				workspaceId,
				timestamp: new Date().toISOString(),
			},
		},
	})
}

// ============================================================================
// Convenience functions for common events
// ============================================================================

/**
 * Emit an order event
 */
export async function emitOrderEvent(
	trigger: Extract<WorkflowTrigger, `order.${string}`>,
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit order.created event
 */
export async function emitOrderCreated(
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitOrderEvent("order.created", data)
}

/**
 * Emit order.paid event
 */
export async function emitOrderPaid(
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitOrderEvent("order.paid", data)
}

/**
 * Emit order.fulfilled event
 */
export async function emitOrderFulfilled(
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitOrderEvent("order.fulfilled", data)
}

/**
 * Emit order.cancelled event
 */
export async function emitOrderCancelled(
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitOrderEvent("order.cancelled", data)
}

/**
 * Emit order.refunded event
 */
export async function emitOrderRefunded(
	data: Omit<OrderEventData, "timestamp">
): Promise<void> {
	await emitOrderEvent("order.refunded", data)
}

/**
 * Emit a customer event
 */
export async function emitCustomerEvent(
	trigger: Extract<WorkflowTrigger, `customer.${string}`>,
	data: Omit<CustomerEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit customer.created event
 */
export async function emitCustomerCreated(
	data: Omit<CustomerEventData, "timestamp">
): Promise<void> {
	await emitCustomerEvent("customer.created", data)
}

/**
 * Emit customer.updated event
 */
export async function emitCustomerUpdated(
	data: Omit<CustomerEventData, "timestamp">
): Promise<void> {
	await emitCustomerEvent("customer.updated", data)
}

/**
 * Emit customer.tag_added event
 */
export async function emitCustomerTagAdded(
	data: Omit<CustomerEventData, "timestamp">
): Promise<void> {
	await emitCustomerEvent("customer.tag_added", data)
}

/**
 * Emit a product event
 */
export async function emitProductEvent(
	trigger: Extract<WorkflowTrigger, `product.${string}`>,
	data: Omit<ProductEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit product.created event
 */
export async function emitProductCreated(
	data: Omit<ProductEventData, "timestamp">
): Promise<void> {
	await emitProductEvent("product.created", data)
}

/**
 * Emit product.updated event
 */
export async function emitProductUpdated(
	data: Omit<ProductEventData, "timestamp">
): Promise<void> {
	await emitProductEvent("product.updated", data)
}

/**
 * Emit product.low_stock event
 */
export async function emitProductLowStock(
	data: Omit<ProductEventData, "timestamp">
): Promise<void> {
	await emitProductEvent("product.low_stock", data)
}

/**
 * Emit product.out_of_stock event
 */
export async function emitProductOutOfStock(
	data: Omit<ProductEventData, "timestamp">
): Promise<void> {
	await emitProductEvent("product.out_of_stock", data)
}

/**
 * Emit a subscription event
 */
export async function emitSubscriptionEvent(
	trigger: Extract<WorkflowTrigger, `subscription.${string}`>,
	data: Omit<SubscriptionEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit subscription.created event
 */
export async function emitSubscriptionCreated(
	data: Omit<SubscriptionEventData, "timestamp">
): Promise<void> {
	await emitSubscriptionEvent("subscription.created", data)
}

/**
 * Emit subscription.renewed event
 */
export async function emitSubscriptionRenewed(
	data: Omit<SubscriptionEventData, "timestamp">
): Promise<void> {
	await emitSubscriptionEvent("subscription.renewed", data)
}

/**
 * Emit subscription.cancelled event
 */
export async function emitSubscriptionCancelled(
	data: Omit<SubscriptionEventData, "timestamp">
): Promise<void> {
	await emitSubscriptionEvent("subscription.cancelled", data)
}

/**
 * Emit subscription.payment_failed event
 */
export async function emitSubscriptionPaymentFailed(
	data: Omit<SubscriptionEventData, "timestamp">
): Promise<void> {
	await emitSubscriptionEvent("subscription.payment_failed", data)
}

/**
 * Emit a review event
 */
export async function emitReviewEvent(
	trigger: Extract<WorkflowTrigger, `review.${string}`>,
	data: Omit<ReviewEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit review.created event
 */
export async function emitReviewCreated(
	data: Omit<ReviewEventData, "timestamp">
): Promise<void> {
	await emitReviewEvent("review.created", data)
}

/**
 * Emit review.approved event
 */
export async function emitReviewApproved(
	data: Omit<ReviewEventData, "timestamp">
): Promise<void> {
	await emitReviewEvent("review.approved", data)
}

/**
 * Emit review.reported event
 */
export async function emitReviewReported(
	data: Omit<ReviewEventData, "timestamp">
): Promise<void> {
	await emitReviewEvent("review.reported", data)
}

/**
 * Emit an auction event
 */
export async function emitAuctionEvent(
	trigger: Extract<WorkflowTrigger, `auction.${string}`>,
	data: Omit<AuctionEventData, "timestamp">
): Promise<void> {
	await emitWorkflowEvent(trigger, data.workspaceId, data)
}

/**
 * Emit auction.started event
 */
export async function emitAuctionStarted(
	data: Omit<AuctionEventData, "timestamp">
): Promise<void> {
	await emitAuctionEvent("auction.started", data)
}

/**
 * Emit auction.bid_placed event
 */
export async function emitAuctionBidPlaced(
	data: Omit<AuctionEventData, "timestamp">
): Promise<void> {
	await emitAuctionEvent("auction.bid_placed", data)
}

/**
 * Emit auction.ending_soon event
 */
export async function emitAuctionEndingSoon(
	data: Omit<AuctionEventData, "timestamp">
): Promise<void> {
	await emitAuctionEvent("auction.ending_soon", data)
}

/**
 * Emit auction.ended event
 */
export async function emitAuctionEnded(
	data: Omit<AuctionEventData, "timestamp">
): Promise<void> {
	await emitAuctionEvent("auction.ended", data)
}

/**
 * Manually trigger a workflow
 */
export async function triggerWorkflowManually(
	workflowId: string,
	triggeredBy: string,
	inputData?: Record<string, unknown>
): Promise<void> {
	await inngest.send({
		name: "workflow/manual-trigger",
		data: {
			workflowId,
			triggeredBy,
			inputData,
		},
	})
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflowRun(runId: string): Promise<void> {
	await inngest.send({
		name: "workflow/cancel",
		data: { runId },
	})
}
