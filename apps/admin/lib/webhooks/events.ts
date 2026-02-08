// Available events that can trigger outgoing webhooks
// This file is shared between client and server code
export const WEBHOOK_EVENTS = {
	// Orders
	"order.created": "When a new order is placed",
	"order.updated": "When an order is updated",
	"order.paid": "When payment is received for an order",
	"order.shipped": "When an order is shipped",
	"order.delivered": "When an order is delivered",
	"order.cancelled": "When an order is cancelled",
	"order.refunded": "When an order is refunded",

	// Inventory
	"inventory.low_stock": "When inventory falls below threshold",
	"inventory.out_of_stock": "When a product goes out of stock",
	"inventory.restocked": "When inventory is restocked",

	// Customers
	"customer.created": "When a new customer signs up",
	"customer.updated": "When a customer profile is updated",

	// Subscriptions
	"subscription.created": "When a subscription is created",
	"subscription.renewed": "When a subscription renews",
	"subscription.cancelled": "When a subscription is cancelled",
	"subscription.paused": "When a subscription is paused",
	"subscription.resumed": "When a subscription is resumed",

	// Products
	"product.created": "When a new product is created",
	"product.updated": "When a product is updated",
	"product.deleted": "When a product is deleted",

	// Reviews
	"review.created": "When a new review is submitted",
	"review.approved": "When a review is approved",
} as const

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS
