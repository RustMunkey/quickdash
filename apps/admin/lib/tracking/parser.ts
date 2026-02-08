/**
 * Email Parser for Shipping Notifications
 *
 * Extracts tracking numbers, carriers, and order references from shipping emails.
 */

import { extractTrackingNumbers, detectCarrier, type CarrierInfo } from "./carrier-detector"

export interface ParsedShippingEmail {
	trackingNumbers: Array<{
		trackingNumber: string
		carrier: CarrierInfo | null
	}>
	orderReferences: string[]
	sender: string
	subject: string
	confidence: "high" | "medium" | "low"
}

// Known shipping email sender patterns
const SHIPPING_SENDERS = [
	/dripshipper/i,
	/shipstation/i,
	/shippo/i,
	/easypost/i,
	/ups\.com/i,
	/fedex\.com/i,
	/usps\.com/i,
	/dhl\.com/i,
	/noreply.*shipping/i,
	/tracking/i,
	/fulfillment/i,
]

// Order reference patterns
const ORDER_PATTERNS = [
	/order\s*#?\s*([A-Z0-9-]+)/gi,
	/order\s+number[:\s]*([A-Z0-9-]+)/gi,
	/reference[:\s]*([A-Z0-9-]+)/gi,
	/confirmation[:\s]*([A-Z0-9-]+)/gi,
	/#([A-Z0-9]{6,})/g,
]

/**
 * Parse a shipping notification email
 */
export function parseShippingEmail(
	from: string,
	subject: string,
	body: string
): ParsedShippingEmail {
	// Clean up HTML if present
	const cleanBody = stripHtml(body)
	const fullText = `${subject}\n${cleanBody}`

	// Extract tracking numbers
	const trackingNumbers = extractTrackingNumbers(fullText)

	// Extract order references
	const orderReferences = extractOrderReferences(fullText)

	// Determine confidence based on sender and content
	const confidence = calculateConfidence(from, subject, trackingNumbers.length)

	return {
		trackingNumbers,
		orderReferences,
		sender: from,
		subject,
		confidence,
	}
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, " ")
		.trim()
}

/**
 * Extract order references from text
 */
function extractOrderReferences(text: string): string[] {
	const references: Set<string> = new Set()

	for (const pattern of ORDER_PATTERNS) {
		const matches = text.matchAll(pattern)
		for (const match of matches) {
			if (match[1] && match[1].length >= 4) {
				references.add(match[1].toUpperCase())
			}
		}
	}

	return Array.from(references)
}

/**
 * Calculate confidence level
 */
function calculateConfidence(
	from: string,
	subject: string,
	trackingCount: number
): "high" | "medium" | "low" {
	let score = 0

	// Check if sender matches known shipping patterns
	if (SHIPPING_SENDERS.some((p) => p.test(from))) {
		score += 3
	}

	// Check subject for shipping keywords
	if (/shipped|tracking|delivery|shipment/i.test(subject)) {
		score += 2
	}

	// Having tracking numbers is a good sign
	if (trackingCount > 0) {
		score += 2
	}

	// Too many tracking numbers might be spam
	if (trackingCount > 5) {
		score -= 1
	}

	if (score >= 5) return "high"
	if (score >= 2) return "medium"
	return "low"
}

/**
 * Check if email is likely a shipping notification
 */
export function isShippingEmail(from: string, subject: string): boolean {
	// Check sender
	if (SHIPPING_SENDERS.some((p) => p.test(from))) {
		return true
	}

	// Check subject
	if (/shipped|tracking|delivery|shipment|your order has/i.test(subject)) {
		return true
	}

	return false
}

/**
 * Match tracking to order by order number
 */
export async function matchTrackingToOrder(
	orderReferences: string[],
	db: any // Pass db client
): Promise<string | null> {
	if (orderReferences.length === 0) return null

	// Try to find an order matching any of the references
	for (const ref of orderReferences) {
		// Try exact match on orderNumber
		const [order] = await db
			.select({ id: db.orders.id })
			.from(db.orders)
			.where(db.eq(db.orders.orderNumber, ref))
			.limit(1)

		if (order) return order.id

		// Try partial match (in case of prefix differences)
		const [partialOrder] = await db
			.select({ id: db.orders.id })
			.from(db.orders)
			.where(db.sql`${db.orders.orderNumber} LIKE ${`%${ref}%`}`)
			.limit(1)

		if (partialOrder) return partialOrder.id
	}

	return null
}
