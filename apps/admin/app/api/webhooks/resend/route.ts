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

/**
 * Legacy / platform-level Resend webhook endpoint.
 * Only works with the platform RESEND_WEBHOOK_SECRET env var (Quickdash's own Resend account).
 *
 * For BYOK workspace webhooks, use /api/webhooks/resend/[workspaceId] instead.
 * Each workspace gets its own unique webhook URL shown on the integrations page.
 */
export async function POST(request: Request) {
	// If no platform-level secret is configured, this endpoint is disabled
	if (!env.RESEND_WEBHOOK_SECRET) {
		return NextResponse.json(
			{
				error: "This endpoint is for the platform Resend account only. Workspace webhooks should use /api/webhooks/resend/{workspaceId}",
			},
			{ status: 410 }
		)
	}

	const svixId = request.headers.get("svix-id") || ""
	const svixTimestamp = request.headers.get("svix-timestamp") || ""
	const svixSignature = request.headers.get("svix-signature") || ""
	const rawBody = await request.text()

	// Verify timestamp to prevent replay attacks
	if (!verifyTimestamp(svixTimestamp)) {
		console.error("Resend webhook timestamp too old (platform)")
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
		console.error("Resend webhook signature verification failed (platform)")
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
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

	const scopedEventId = `platform:${eventId}`

	// Check if already processed
	const alreadyProcessed = await isWebhookProcessed("resend", scopedEventId)
	if (alreadyProcessed) {
		return NextResponse.json({ status: "already_processed" })
	}

	// Log the webhook event
	const webhookEventId = await logWebhookEvent({
		provider: "resend",
		eventType: event.type,
		externalId: scopedEventId,
		payload: payload as Record<string, unknown>,
		headers: {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
		},
	})

	try {
		// Platform-level webhooks don't have a specific workspace — pass empty string
		// These are for Quickdash's own transactional emails (password resets, etc.)
		await inngest.send({
			name: `resend/${event.type}`,
			data: {
				webhookEventId,
				workspaceId: "",
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
