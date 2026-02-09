import { NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"
import { inngest } from "@/lib/inngest"
import {
	logWebhookEvent,
	isWebhookProcessed,
	updateWebhookStatus,
} from "@/lib/webhooks"
import { verifyResendSignature, verifyTimestamp } from "@/lib/webhooks/verify"
import { parseResendEvent, type ResendWebhookEvent } from "@/lib/webhooks/resend"

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ workspaceId: string }> }
) {
	const { workspaceId } = await params

	// Validate workspaceId format (UUID)
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)) {
		return NextResponse.json({ error: "Invalid workspace ID" }, { status: 400 })
	}

	// Look up the workspace's Resend integration to get their signing secret
	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspaceId),
				eq(schema.workspaceIntegrations.provider, "resend"),
				eq(schema.workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (!integration) {
		return NextResponse.json(
			{ error: "No Resend integration configured for this workspace" },
			{ status: 404 }
		)
	}

	const svixId = request.headers.get("svix-id") || ""
	const svixTimestamp = request.headers.get("svix-timestamp") || ""
	const svixSignature = request.headers.get("svix-signature") || ""
	const rawBody = await request.text()

	// Get the webhook signing secret from the integration credentials
	const credentials = integration.credentials as { apiKey?: string; webhookSecret?: string } | null
	const webhookSecret = credentials?.webhookSecret

	if (webhookSecret) {
		// Verify timestamp to prevent replay attacks
		if (!verifyTimestamp(svixTimestamp)) {
			console.error(`Resend webhook timestamp too old for workspace ${workspaceId}`)
			return NextResponse.json({ error: "Timestamp too old" }, { status: 401 })
		}

		const isValid = verifyResendSignature(
			rawBody,
			svixId,
			svixTimestamp,
			svixSignature,
			webhookSecret
		)
		if (!isValid) {
			console.error(`Resend webhook signature verification failed for workspace ${workspaceId}`)
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
		}
	} else {
		// No signing secret configured — reject to prevent spoofing
		console.error(`Resend webhook received for workspace ${workspaceId} but no signing secret configured`)
		return NextResponse.json(
			{ error: "Webhook signing secret not configured. Add it in Settings > Integrations." },
			{ status: 403 }
		)
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

	// Use svix-id for idempotency, scoped to workspace
	const eventId = svixId || event.data.email_id
	if (!eventId) {
		return NextResponse.json({ error: "Missing event ID" }, { status: 400 })
	}

	const scopedEventId = `${workspaceId}:${eventId}`

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
		// Send to Inngest for processing — include workspaceId so handlers know who this belongs to
		await inngest.send({
			name: `resend/${event.type}`,
			data: {
				webhookEventId,
				workspaceId,
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
