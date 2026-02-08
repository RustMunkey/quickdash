import { NextResponse } from "next/server"
import { eq, sql } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { incomingWebhookUrls, teamMessages, type MessageEmbed, type MessageAttachment } from "@quickdash/db/schema"
import { pusherServer } from "@/lib/pusher-server"
import { nanoid } from "nanoid"

// Discord-style incoming webhook payload
interface IncomingWebhookPayload {
	content?: string
	username?: string
	avatar_url?: string
	embeds?: MessageEmbed[]
	attachments?: MessageAttachment[]
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	const { token } = await params

	// Find the webhook URL by token
	const [webhook] = await db
		.select()
		.from(incomingWebhookUrls)
		.where(eq(incomingWebhookUrls.token, token))
		.limit(1)

	if (!webhook) {
		return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
	}

	if (!webhook.isActive) {
		return NextResponse.json({ error: "Webhook is disabled" }, { status: 403 })
	}

	// Parse the payload
	let payload: IncomingWebhookPayload
	try {
		payload = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
	}

	// Validate - need at least content or embeds
	if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
		return NextResponse.json(
			{ error: "Must provide content or embeds" },
			{ status: 400 }
		)
	}

	// Optional: Check allowed sources
	if (webhook.allowedSources && webhook.allowedSources.length > 0) {
		const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		const origin = request.headers.get("origin")

		const isAllowed = webhook.allowedSources.some((source) => {
			if (clientIp && source === clientIp) return true
			if (origin && origin.includes(source)) return true
			return false
		})

		if (!isAllowed) {
			return NextResponse.json({ error: "Source not allowed" }, { status: 403 })
		}
	}

	// Create the message
	const [message] = await db
		.insert(teamMessages)
		.values({
			webhookId: webhook.id,
			webhookUsername: payload.username || webhook.defaultUsername || webhook.name,
			webhookAvatarUrl: payload.avatar_url || webhook.defaultAvatarUrl,
			channel: webhook.channel,
			body: payload.content || null,
			contentType: "markdown",
			embeds: payload.embeds || [],
			attachments: payload.attachments || [],
			isSystemMessage: false,
		})
		.returning()

	// Update webhook usage stats
	await db
		.update(incomingWebhookUrls)
		.set({
			lastUsedAt: new Date(),
			messageCount: sql`${incomingWebhookUrls.messageCount} + 1`,
		})
		.where(eq(incomingWebhookUrls.id, webhook.id))

	// Broadcast via Pusher to the channel
	if (pusherServer) {
		await pusherServer.trigger(`private-channel-${webhook.channel}`, "message:created", {
			id: message.id,
			webhookId: webhook.id,
			webhookUsername: message.webhookUsername,
			webhookAvatarUrl: message.webhookAvatarUrl,
			channel: message.channel,
			body: message.body,
			contentType: message.contentType,
			embeds: message.embeds,
			attachments: message.attachments,
			isSystemMessage: message.isSystemMessage,
			createdAt: message.createdAt.toISOString(),
		})
	}

	return NextResponse.json({
		success: true,
		message_id: message.id,
	})
}

// GET returns info about the webhook (for testing)
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	const { token } = await params

	const [webhook] = await db
		.select({
			name: incomingWebhookUrls.name,
			channel: incomingWebhookUrls.channel,
			isActive: incomingWebhookUrls.isActive,
		})
		.from(incomingWebhookUrls)
		.where(eq(incomingWebhookUrls.token, token))
		.limit(1)

	if (!webhook) {
		return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
	}

	return NextResponse.json({
		name: webhook.name,
		channel: webhook.channel,
		active: webhook.isActive,
	})
}
