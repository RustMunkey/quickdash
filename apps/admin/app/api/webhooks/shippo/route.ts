import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { orders, shipmentTracking } from "@quickdash/db/schema"

/**
 * Shippo Webhook Handler
 *
 * Receives events from Shippo and updates order/tracking status.
 * Verifies HMAC-SHA256 signature for security.
 *
 * Supported event types:
 * - track_updated: Tracking status changed
 * - transaction_created: Label purchased successfully
 * - transaction_updated: Transaction status changed
 */

const SHIPPO_WEBHOOK_SECRET = process.env.SHIPPO_WEBHOOK_SECRET

/**
 * Verify the HMAC signature from Shippo
 */
function verifySignature(payload: string, signature: string | null): boolean {
	if (!SHIPPO_WEBHOOK_SECRET) {
		console.warn("[Shippo Webhook] No webhook secret configured - skipping verification")
		return true // Allow if no secret configured (dev mode)
	}

	if (!signature) {
		console.error("[Shippo Webhook] No signature provided")
		return false
	}

	try {
		const expectedSignature = createHmac("sha256", SHIPPO_WEBHOOK_SECRET)
			.update(payload)
			.digest("hex")

		// Use timing-safe comparison to prevent timing attacks
		const sigBuffer = Buffer.from(signature)
		const expectedBuffer = Buffer.from(expectedSignature)

		if (sigBuffer.length !== expectedBuffer.length) {
			return false
		}

		return timingSafeEqual(sigBuffer, expectedBuffer)
	} catch (error) {
		console.error("[Shippo Webhook] Signature verification error:", error)
		return false
	}
}

interface ShippoWebhookEvent {
	event: string
	data: Record<string, unknown>
}

interface ShippoTrackingData {
	tracking_number: string
	carrier: string
	tracking_status: {
		status: string // UNKNOWN, PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE
		status_details: string
		status_date: string
		location?: {
			city?: string
			state?: string
			zip?: string
			country?: string
		}
	}
	tracking_history: Array<{
		status: string
		status_details: string
		status_date: string
		location?: {
			city?: string
			state?: string
			zip?: string
			country?: string
		}
	}>
	eta?: string
}

interface ShippoTransactionData {
	object_id: string
	status: "SUCCESS" | "QUEUED" | "WAITING" | "ERROR"
	tracking_number?: string
	label_url?: string
	rate: {
		provider: string
		servicelevel: { name: string; token: string }
		amount: string
		currency: string
	}
	messages?: Array<{ text: string }>
}

// Map Shippo status to our internal status
function mapShippoStatus(shippoStatus: string): string {
	const statusMap: Record<string, string> = {
		UNKNOWN: "unknown",
		PRE_TRANSIT: "pending",
		TRANSIT: "in_transit",
		DELIVERED: "delivered",
		RETURNED: "returned",
		FAILURE: "failed",
	}
	return statusMap[shippoStatus] || "unknown"
}

// Format location string
function formatLocation(location?: { city?: string; state?: string; country?: string }): string | undefined {
	if (!location) return undefined
	const parts = [location.city, location.state, location.country].filter(Boolean)
	return parts.length > 0 ? parts.join(", ") : undefined
}

export async function POST(request: NextRequest) {
	try {
		// Get raw body for signature verification
		const rawBody = await request.text()
		const signature = request.headers.get("x-shippo-signature")

		// Verify HMAC signature
		if (!verifySignature(rawBody, signature)) {
			console.error("[Shippo Webhook] Invalid signature")
			return NextResponse.json(
				{ error: "Invalid signature" },
				{ status: 401 }
			)
		}

		const payload: ShippoWebhookEvent = JSON.parse(rawBody)
		const { event, data } = payload

		console.log(`[Shippo Webhook] Received event: ${event}`)

		switch (event) {
			case "track_updated":
				return await handleTrackingUpdate(data as unknown as ShippoTrackingData)

			case "transaction_created":
			case "transaction_updated":
				return await handleTransactionEvent(event, data as unknown as ShippoTransactionData)

			case "batch_created":
			case "batch_purchased":
				console.log(`[Shippo Webhook] Batch event: ${event}`, data)
				return NextResponse.json({ received: true, event, processed: false })

			default:
				console.log(`[Shippo Webhook] Unknown event type: ${event}`)
				return NextResponse.json({ received: true, event, skipped: "unknown event type" })
		}
	} catch (error) {
		console.error("[Shippo Webhook] Error processing webhook:", error)
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		)
	}
}

async function handleTrackingUpdate(data: ShippoTrackingData) {
	const { tracking_number, carrier, tracking_status, tracking_history, eta } = data

	if (!tracking_number) {
		return NextResponse.json({ error: "Missing tracking number" }, { status: 400 })
	}

	// Find orders with this tracking number
	const matchingOrders = await db
		.select({
			id: orders.id,
			workspaceId: orders.workspaceId,
			status: orders.status,
		})
		.from(orders)
		.where(eq(orders.trackingNumber, tracking_number))

	if (matchingOrders.length === 0) {
		console.log(`[Shippo Webhook] No orders found for tracking: ${tracking_number}`)
		return NextResponse.json({ received: true, matched: false })
	}

	const internalStatus = mapShippoStatus(tracking_status.status)

	// Build status history for the tracking record
	const statusHistory = tracking_history.map((h) => ({
		status: mapShippoStatus(h.status),
		timestamp: h.status_date,
		location: formatLocation(h.location),
	}))

	for (const order of matchingOrders) {
		// Update or create tracking record
		const [existingTracking] = await db
			.select()
			.from(shipmentTracking)
			.where(eq(shipmentTracking.trackingNumber, tracking_number))
			.limit(1)

		if (existingTracking) {
			await db
				.update(shipmentTracking)
				.set({
					status: internalStatus,
					statusHistory: statusHistory,
					estimatedDelivery: eta ? new Date(eta) : null,
					lastUpdatedAt: new Date(),
				})
				.where(eq(shipmentTracking.id, existingTracking.id))
		}
		// Note: We don't create new tracking records here - they're created when labels are generated

		// Update order status if delivered
		if (internalStatus === "delivered" && order.status !== "delivered") {
			await db
				.update(orders)
				.set({
					status: "delivered",
					deliveredAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(orders.id, order.id))

			console.log(`[Shippo Webhook] Order ${order.id} marked as delivered`)
		}
	}

	console.log(`[Shippo Webhook] Updated ${matchingOrders.length} orders for tracking: ${tracking_number}`)

	return NextResponse.json({
		received: true,
		event: "track_updated",
		matched: true,
		ordersUpdated: matchingOrders.length,
	})
}

async function handleTransactionEvent(event: string, data: ShippoTransactionData) {
	const { object_id, status, tracking_number, label_url, rate, messages } = data

	console.log(`[Shippo Webhook] Transaction ${object_id}: ${status}`)

	// If there's an error, log it
	if (status === "ERROR" && messages?.length) {
		console.error(`[Shippo Webhook] Transaction error:`, messages.map(m => m.text).join(", "))
	}

	// If we have a tracking number, try to find and log the order
	if (tracking_number) {
		const [order] = await db
			.select({ id: orders.id, orderNumber: orders.orderNumber })
			.from(orders)
			.where(eq(orders.trackingNumber, tracking_number))
			.limit(1)

		if (order) {
			console.log(`[Shippo Webhook] Transaction for order #${order.orderNumber}: ${status}`)
		}
	}

	return NextResponse.json({
		received: true,
		event,
		transactionId: object_id,
		status,
	})
}

// Shippo sends a GET request to verify the endpoint
export async function GET() {
	return NextResponse.json({ status: "ok", service: "shippo-webhooks" })
}
