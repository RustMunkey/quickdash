import { NextResponse } from "next/server"
import { env } from "@/env"
import { inngest } from "@/lib/inngest"
import {
	logWebhookEvent,
	isWebhookProcessed,
	updateWebhookStatus,
} from "@/lib/webhooks"
import { verifyResendSignature, verifyTimestamp } from "@/lib/webhooks/verify"
import { parseResendEvent, type ResendWebhookEvent } from "@/lib/webhooks/resend"

export async function POST(request: Request) {
	const svixId = request.headers.get("svix-id") || ""
	const svixTimestamp = request.headers.get("svix-timestamp") || ""
	const svixSignature = request.headers.get("svix-signature") || ""
	const rawBody = await request.text()

	// Verify signature if secret is configured
	if (env.RESEND_WEBHOOK_SECRET) {
		// Verify timestamp to prevent replay attacks
		if (!verifyTimestamp(svixTimestamp)) {
			console.error("Resend webhook timestamp too old")
			return NextResponse.json({ error: "Timestamp too old" }, { status: 401 })
		}

		const isValid = verifyResendSignature(
			rawBody,
			svixId,
			svixTimestamp,
			svixSignature,
			env.RESEND_WEBHOOK_SECRET
		)
		if (!isValid) {
			console.error("Resend webhook signature verification failed")
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
		}
	}

	let payload: unknown
	try {
		payload = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	let event: ResendWebhookEvent
	try {
		event = parseResendEvent(payload)
	} catch (error) {
		console.error("Failed to parse Resend event:", error)
		return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
	}

	// Use svix-id for idempotency
	const eventId = svixId || event.data.email_id
	if (!eventId) {
		return NextResponse.json({ error: "Missing event ID" }, { status: 400 })
	}

	// Check if already processed
	const alreadyProcessed = await isWebhookProcessed("resend", eventId)
	if (alreadyProcessed) {
		return NextResponse.json({ status: "already_processed" })
	}

	// Log the webhook event
	const webhookEventId = await logWebhookEvent({
		provider: "resend",
		eventType: event.type,
		externalId: eventId,
		payload: payload as Record<string, unknown>,
		headers: {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
		},
	})

	try {
		// Send to Inngest for processing
		await inngest.send({
			name: `resend/${event.type}`,
			data: {
				webhookEventId,
				event,
			},
		})

		await updateWebhookStatus(webhookEventId, "processing")

		return NextResponse.json({ status: "processing", webhookEventId })
	} catch (error) {
		console.error("Failed to queue Resend webhook:", error)
		await updateWebhookStatus(webhookEventId, "failed", String(error))
		return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
	}
}
