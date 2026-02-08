import { NextResponse } from "next/server"
import { env } from "@/env"
import { inngest } from "@/lib/inngest"
import {
	logWebhookEvent,
	isWebhookProcessed,
	updateWebhookStatus,
} from "@/lib/webhooks"
import { verifyPolarSignature } from "@/lib/webhooks/verify"
import { parsePolarEvent, type PolarWebhookEvent } from "@/lib/webhooks/polar"

export async function POST(request: Request) {
	const signature = request.headers.get("webhook-signature") || ""
	const rawBody = await request.text()

	// Verify signature if secret is configured
	if (env.POLAR_WEBHOOK_SECRET) {
		const isValid = verifyPolarSignature(rawBody, signature, env.POLAR_WEBHOOK_SECRET)
		if (!isValid) {
			console.error("Polar webhook signature verification failed")
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
		}
	}

	let payload: unknown
	try {
		payload = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	let event: PolarWebhookEvent
	try {
		event = parsePolarEvent(payload)
	} catch (error) {
		console.error("Failed to parse Polar event:", error)
		return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
	}

	// Extract event ID for idempotency (Polar includes this in the payload)
	const eventId = (event.data as { id?: string }).id
	if (!eventId) {
		return NextResponse.json({ error: "Missing event ID" }, { status: 400 })
	}

	// Check if already processed
	const alreadyProcessed = await isWebhookProcessed("polar", eventId)
	if (alreadyProcessed) {
		return NextResponse.json({ status: "already_processed" })
	}

	// Log the webhook event
	const webhookEventId = await logWebhookEvent({
		provider: "polar",
		eventType: event.type,
		externalId: eventId,
		payload: payload as Record<string, unknown>,
		headers: Object.fromEntries(request.headers.entries()),
	})

	try {
		// Send to Inngest for processing
		await inngest.send({
			name: `polar/${event.type}`,
			data: {
				webhookEventId,
				event,
			},
		})

		await updateWebhookStatus(webhookEventId, "processing")

		return NextResponse.json({ status: "processing", webhookEventId })
	} catch (error) {
		console.error("Failed to queue Polar webhook:", error)
		await updateWebhookStatus(webhookEventId, "failed", String(error))
		return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
	}
}
