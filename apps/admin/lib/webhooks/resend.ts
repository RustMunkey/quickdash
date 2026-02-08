/**
 * Resend webhook event types and payload definitions
 * https://resend.com/docs/dashboard/webhooks/introduction
 */

// Email Events
export interface ResendEmailSent {
	type: "email.sent"
	created_at: string
	data: ResendEmailData
}

export interface ResendEmailDelivered {
	type: "email.delivered"
	created_at: string
	data: ResendEmailData
}

export interface ResendEmailDeliveryDelayed {
	type: "email.delivery_delayed"
	created_at: string
	data: ResendEmailData
}

export interface ResendEmailComplained {
	type: "email.complained"
	created_at: string
	data: ResendEmailData
}

export interface ResendEmailBounced {
	type: "email.bounced"
	created_at: string
	data: ResendEmailBounceData
}

export interface ResendEmailOpened {
	type: "email.opened"
	created_at: string
	data: ResendEmailData
}

export interface ResendEmailClicked {
	type: "email.clicked"
	created_at: string
	data: ResendEmailClickData
}

// Union type for all Resend webhook events
export type ResendWebhookEvent =
	| ResendEmailSent
	| ResendEmailDelivered
	| ResendEmailDeliveryDelayed
	| ResendEmailComplained
	| ResendEmailBounced
	| ResendEmailOpened
	| ResendEmailClicked

// Base types

export interface ResendEmailData {
	email_id: string
	from: string
	to: string[]
	subject: string
	created_at: string
}

export interface ResendEmailBounceData extends ResendEmailData {
	bounce: {
		message: string
	}
}

export interface ResendEmailClickData extends ResendEmailData {
	click: {
		ipAddress: string
		link: string
		timestamp: string
		userAgent: string
	}
}

/**
 * Parse and validate a Resend webhook payload
 */
export function parseResendEvent(payload: unknown): ResendWebhookEvent {
	const event = payload as ResendWebhookEvent

	if (!event.type || !event.data) {
		throw new Error("Invalid Resend webhook payload: missing type or data")
	}

	return event
}

/**
 * Get a human-readable description of a Resend event
 */
export function getResendEventDescription(event: ResendWebhookEvent): string {
	const recipient = event.data.to[0] || "unknown"

	switch (event.type) {
		case "email.sent":
			return `Email sent to ${recipient}: ${event.data.subject}`
		case "email.delivered":
			return `Email delivered to ${recipient}`
		case "email.delivery_delayed":
			return `Email delivery delayed for ${recipient}`
		case "email.complained":
			return `Email marked as spam by ${recipient}`
		case "email.bounced":
			return `Email bounced for ${recipient}: ${event.data.bounce.message}`
		case "email.opened":
			return `Email opened by ${recipient}`
		case "email.clicked":
			return `Link clicked in email by ${recipient}`
		default:
			return "Unknown Resend event"
	}
}

/**
 * Check if an email event indicates a problem
 */
export function isEmailProblem(event: ResendWebhookEvent): boolean {
	return ["email.bounced", "email.complained", "email.delivery_delayed"].includes(event.type)
}
