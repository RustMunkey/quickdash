/**
 * Polar webhook event types and payload definitions
 * https://docs.polar.sh/api-reference/webhooks
 */

// Checkout Events
export interface PolarCheckoutCreated {
	type: "checkout.created"
	data: PolarCheckout
}

export interface PolarCheckoutUpdated {
	type: "checkout.updated"
	data: PolarCheckout
}

// Order Events
export interface PolarOrderCreated {
	type: "order.created"
	data: PolarOrder
}

// Subscription Events
export interface PolarSubscriptionCreated {
	type: "subscription.created"
	data: PolarSubscription
}

export interface PolarSubscriptionUpdated {
	type: "subscription.updated"
	data: PolarSubscription
}

export interface PolarSubscriptionActive {
	type: "subscription.active"
	data: PolarSubscription
}

export interface PolarSubscriptionCanceled {
	type: "subscription.canceled"
	data: PolarSubscription
}

export interface PolarSubscriptionRevoked {
	type: "subscription.revoked"
	data: PolarSubscription
}

// Benefit Events
export interface PolarBenefitGrantCreated {
	type: "benefit_grant.created"
	data: PolarBenefitGrant
}

export interface PolarBenefitGrantUpdated {
	type: "benefit_grant.updated"
	data: PolarBenefitGrant
}

export interface PolarBenefitGrantRevoked {
	type: "benefit_grant.revoked"
	data: PolarBenefitGrant
}

// Union type for all Polar webhook events
export type PolarWebhookEvent =
	| PolarCheckoutCreated
	| PolarCheckoutUpdated
	| PolarOrderCreated
	| PolarSubscriptionCreated
	| PolarSubscriptionUpdated
	| PolarSubscriptionActive
	| PolarSubscriptionCanceled
	| PolarSubscriptionRevoked
	| PolarBenefitGrantCreated
	| PolarBenefitGrantUpdated
	| PolarBenefitGrantRevoked

// Base types

export interface PolarCheckout {
	id: string
	status: "open" | "expired" | "confirmed" | "succeeded"
	client_secret: string
	url: string
	expires_at: string
	success_url: string
	embed_origin: string | null
	amount: number
	tax_amount: number
	currency: string
	subtotal_amount: number
	total_amount: number
	product_id: string
	product_price_id: string
	discount_id: string | null
	allow_discount_codes: boolean
	is_discount_applicable: boolean
	is_free_product_price: boolean
	is_payment_required: boolean
	is_payment_setup_required: boolean
	is_payment_form_required: boolean
	customer_id: string | null
	customer_name: string | null
	customer_email: string | null
	customer_ip_address: string | null
	customer_billing_address: PolarAddress | null
	customer_tax_id: string | null
	payment_processor: "stripe" | null
	metadata: Record<string, string>
	created_at: string
	modified_at: string | null
	custom_field_data: Record<string, unknown>
	product: PolarProduct
	product_price: PolarProductPrice
	discount: PolarDiscount | null
	subscription_id: string | null
	attached_custom_fields: PolarCustomField[]
}

export interface PolarOrder {
	id: string
	amount: number
	tax_amount: number
	currency: string
	billing_reason: "purchase" | "subscription_create" | "subscription_cycle" | "subscription_update"
	billing_address: PolarAddress | null
	customer_id: string
	product_id: string
	product_price_id: string
	discount_id: string | null
	subscription_id: string | null
	checkout_id: string | null
	metadata: Record<string, string>
	created_at: string
	modified_at: string | null
	user: PolarUser
	product: PolarProduct
	product_price: PolarProductPrice
	discount: PolarDiscount | null
	subscription: PolarSubscription | null
}

export interface PolarSubscription {
	id: string
	status: "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid"
	current_period_start: string
	current_period_end: string | null
	cancel_at_period_end: boolean
	canceled_at: string | null
	ended_at: string | null
	started_at: string | null
	customer_id: string
	product_id: string
	price_id: string
	discount_id: string | null
	checkout_id: string | null
	metadata: Record<string, string>
	created_at: string
	modified_at: string | null
	user: PolarUser
	product: PolarProduct
	price: PolarProductPrice
	discount: PolarDiscount | null
}

export interface PolarBenefitGrant {
	id: string
	granted_at: string | null
	revoked_at: string | null
	customer_id: string
	benefit_id: string
	subscription_id: string | null
	order_id: string | null
	is_granted: boolean
	is_revoked: boolean
	created_at: string
	modified_at: string | null
	user: PolarUser
	benefit: PolarBenefit
	properties: Record<string, unknown>
}

export interface PolarUser {
	id: string
	email: string
	public_name: string
	avatar_url: string | null
}

export interface PolarProduct {
	id: string
	name: string
	description: string | null
	is_recurring: boolean
	is_archived: boolean
	organization_id: string
	created_at: string
	modified_at: string | null
	prices: PolarProductPrice[]
	benefits: PolarBenefit[]
	medias: PolarMedia[]
}

export interface PolarProductPrice {
	id: string
	type: "one_time" | "recurring"
	amount_type: "fixed" | "custom" | "free"
	price_amount: number | null
	price_currency: string
	minimum_amount: number | null
	maximum_amount: number | null
	preset_amount: number | null
	recurring_interval: "month" | "year" | null
	is_archived: boolean
	created_at: string
	modified_at: string | null
}

export interface PolarBenefit {
	id: string
	type: string
	description: string
	selectable: boolean
	deletable: boolean
	organization_id: string
	created_at: string
	modified_at: string | null
}

export interface PolarDiscount {
	id: string
	name: string
	code: string | null
	type: "fixed" | "percentage"
	amount: number
	currency: string | null
	max_redemptions: number | null
	redemptions_count: number
	organization_id: string
	created_at: string
	modified_at: string | null
}

export interface PolarAddress {
	line1: string | null
	line2: string | null
	postal_code: string | null
	city: string | null
	state: string | null
	country: string
}

export interface PolarMedia {
	id: string
	organization_id: string
	name: string
	path: string
	mime_type: string
	size: number
	storage_version: string | null
	checksum_etag: string | null
	checksum_sha256_base64: string | null
	checksum_sha256_hex: string | null
	last_modified_at: string | null
	version: string | null
	is_uploaded: boolean
	created_at: string
	size_readable: string
	public_url: string
}

export interface PolarCustomField {
	custom_field_id: string
	custom_field: {
		id: string
		type: "text" | "number" | "date" | "checkbox" | "select"
		slug: string
		name: string
		metadata: Record<string, unknown>
		organization_id: string
		created_at: string
		modified_at: string | null
		properties: Record<string, unknown>
	}
	order: number
	required: boolean
}

/**
 * Parse and validate a Polar webhook payload
 */
export function parsePolarEvent(payload: unknown): PolarWebhookEvent {
	const event = payload as PolarWebhookEvent

	if (!event.type || !event.data) {
		throw new Error("Invalid Polar webhook payload: missing type or data")
	}

	return event
}

/**
 * Get a human-readable description of a Polar event
 */
export function getPolarEventDescription(event: PolarWebhookEvent): string {
	switch (event.type) {
		case "checkout.created":
			return `Checkout created for ${event.data.product.name}`
		case "checkout.updated":
			return `Checkout ${event.data.status} for ${event.data.product.name}`
		case "order.created":
			return `New order from ${event.data.user.email} for ${event.data.product.name}`
		case "subscription.created":
			return `New subscription from ${event.data.user.email}`
		case "subscription.updated":
			return `Subscription ${event.data.status} for ${event.data.user.email}`
		case "subscription.active":
			return `Subscription activated for ${event.data.user.email}`
		case "subscription.canceled":
			return `Subscription canceled for ${event.data.user.email}`
		case "subscription.revoked":
			return `Subscription revoked for ${event.data.user.email}`
		case "benefit_grant.created":
			return `Benefit granted to ${event.data.user.email}`
		case "benefit_grant.updated":
			return `Benefit updated for ${event.data.user.email}`
		case "benefit_grant.revoked":
			return `Benefit revoked for ${event.data.user.email}`
		default:
			return "Unknown Polar event"
	}
}
