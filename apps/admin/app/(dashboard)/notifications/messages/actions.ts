"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { teamMessages, teamMessageRecipients, users, workspaceMembers } from "@quickdash/db/schema"
import { eq, desc, asc, and, isNull, ne } from "@quickdash/db/drizzle"
import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher-server"
import { put } from "@vercel/blob"
import type { MessageAttachment } from "./types"
import { requireWorkspace } from "@/lib/workspace"

export async function getTeamMessages(userId: string) {
	const workspace = await requireWorkspace()
	return db
		.select({
			id: teamMessages.id,
			senderId: teamMessages.senderId,
			senderName: users.name,
			senderImage: users.image,
			channel: teamMessages.channel,
			body: teamMessages.body,
			contentType: teamMessages.contentType,
			callData: teamMessages.callData,
			attachments: teamMessages.attachments,
			createdAt: teamMessages.createdAt,
			readAt: teamMessageRecipients.readAt,
		})
		.from(teamMessageRecipients)
		.innerJoin(teamMessages, eq(teamMessageRecipients.messageId, teamMessages.id))
		.innerJoin(users, eq(teamMessages.senderId, users.id))
		.where(and(eq(teamMessageRecipients.recipientId, userId), eq(teamMessages.workspaceId, workspace.id)))
		.orderBy(asc(teamMessages.createdAt))
		.limit(100)
}

export async function getUnreadCount(userId: string) {
	const workspace = await requireWorkspace()
	const unread = await db
		.select({ id: teamMessageRecipients.id })
		.from(teamMessageRecipients)
		.innerJoin(teamMessages, eq(teamMessageRecipients.messageId, teamMessages.id))
		.where(
			and(
				eq(teamMessageRecipients.recipientId, userId),
				eq(teamMessages.workspaceId, workspace.id),
				isNull(teamMessageRecipients.readAt)
			)
		)
	return unread.length
}

export async function getRecentMessages(userId: string, limit = 5) {
	const workspace = await requireWorkspace()
	const messages = await db
		.select({
			id: teamMessages.id,
			content: teamMessages.body,
			createdAt: teamMessages.createdAt,
			senderId: teamMessages.senderId,
			senderName: users.name,
			senderImage: users.image,
			channel: teamMessages.channel,
		})
		.from(teamMessageRecipients)
		.innerJoin(teamMessages, eq(teamMessageRecipients.messageId, teamMessages.id))
		.innerJoin(users, eq(teamMessages.senderId, users.id))
		.where(
			and(
				eq(teamMessageRecipients.recipientId, userId),
				eq(teamMessages.workspaceId, workspace.id),
				ne(teamMessages.senderId, userId) // Don't show own messages
			)
		)
		.orderBy(desc(teamMessages.createdAt))
		.limit(limit)

	return messages.map(m => ({
		id: m.id,
		content: m.content,
		createdAt: m.createdAt,
		sender: {
			id: m.senderId,
			name: m.senderName || "Unknown",
			image: m.senderImage,
		},
		channel: m.channel,
	}))
}

export async function sendTeamMessage(data: {
	body: string
	channel?: string
	recipientIds?: string[]
	attachments?: MessageAttachment[]
}) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	const senderId = session.user.id
	const channel = data.channel || "general"

	// Fetch fresh user data from database (not session cache)
	const [senderData] = await db
		.select({ name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, senderId))
		.limit(1)

	let recipientIds = data.recipientIds
	if (!recipientIds || recipientIds.length === 0) {
		// Get all workspace members except the sender
		const workspaceUsers = await db
			.select({ userId: workspaceMembers.userId })
			.from(workspaceMembers)
			.where(and(eq(workspaceMembers.workspaceId, workspace.id), ne(workspaceMembers.userId, senderId)))
		recipientIds = workspaceUsers.map((u) => u.userId)
	}

	const [message] = await db
		.insert(teamMessages)
		.values({ workspaceId: workspace.id, senderId, channel, body: data.body, attachments: data.attachments || [] })
		.returning()

	// Insert recipient records for all recipients
	await db.insert(teamMessageRecipients).values(
		recipientIds.map((recipientId) => ({
			messageId: message.id,
			recipientId,
		}))
	)

	// Also insert sender as recipient of their own message (marked as read)
	// This ensures sender's messages appear when they reload the page
	await db.insert(teamMessageRecipients).values({
		messageId: message.id,
		recipientId: senderId,
		readAt: new Date(),
	})

	// Fire Pusher notifications in parallel, don't block response
	if (pusherServer) {
		const pusher = pusherServer
		const payload = {
			id: message.id,
			senderId,
			senderName: senderData?.name || session.user.name,
			senderImage: senderData?.image || null,
			channel,
			body: data.body,
			attachments: data.attachments || [], // Required for instant message display
			createdAt: message.createdAt.toISOString(),
			readAt: null,
		}
		// Non-blocking: fire all triggers in parallel
		Promise.all(
			recipientIds.map((recipientId) =>
				pusher.trigger(`private-user-${recipientId}`, "new-message", payload)
			)
		).catch(() => {}) // Ignore errors, message is already saved
	}

	return message
}

export async function markMessageRead(messageId: string) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	const readAt = new Date()

	await db
		.update(teamMessageRecipients)
		.set({ readAt })
		.where(
			and(
				eq(teamMessageRecipients.messageId, messageId),
				eq(teamMessageRecipients.recipientId, session.user.id)
			)
		)

	// Notify the sender that their message was read (non-blocking)
	if (pusherServer) {
		const pusher = pusherServer
		const userId = session.user.id
		const userName = session.user.name
		db.select({ senderId: teamMessages.senderId })
			.from(teamMessages)
			.where(eq(teamMessages.id, messageId))
			.then(([message]) => {
				if (message && message.senderId !== userId) {
					pusher.trigger(`private-user-${message.senderId}`, "message-read", {
						messageId,
						readBy: userName,
						readAt: readAt.toISOString(),
					}).catch(() => {})
				}
			})
			.catch(() => {})
	}
}

export async function getTeamMembers() {
	const workspace = await requireWorkspace()
	return db
		.select({ id: users.id, name: users.name, email: users.email, image: users.image })
		.from(users)
		.innerJoin(workspaceMembers, eq(users.id, workspaceMembers.userId))
		.where(eq(workspaceMembers.workspaceId, workspace.id))
		.orderBy(users.name)
}

export async function markAllRead() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	await db
		.update(teamMessageRecipients)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(teamMessageRecipients.recipientId, session.user.id),
				isNull(teamMessageRecipients.readAt)
			)
		)
}

export async function clearConversationMessages(channel: string) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	// Get message IDs for this channel in this workspace
	const channelMessages = await db
		.select({ id: teamMessages.id })
		.from(teamMessages)
		.where(and(eq(teamMessages.channel, channel), eq(teamMessages.workspaceId, workspace.id)))

	if (channelMessages.length === 0) return

	const messageIds = channelMessages.map(m => m.id)

	// Delete only the recipient records for this user in this channel
	// This removes messages from their view without affecting other users
	for (const msgId of messageIds) {
		await db
			.delete(teamMessageRecipients)
			.where(
				and(
					eq(teamMessageRecipients.messageId, msgId),
					eq(teamMessageRecipients.recipientId, session.user.id)
				)
			)
	}
}

// Get read receipts for messages sent by the current user
export async function getReadReceipts(messageIds: string[]) {
	if (messageIds.length === 0) return {}

	const receipts = await db
		.select({
			messageId: teamMessageRecipients.messageId,
			recipientId: teamMessageRecipients.recipientId,
			recipientName: users.name,
			readAt: teamMessageRecipients.readAt,
		})
		.from(teamMessageRecipients)
		.innerJoin(users, eq(teamMessageRecipients.recipientId, users.id))
		.where(
			and(
				eq(teamMessageRecipients.messageId, messageIds[0] as string),
				// We'll handle multiple IDs by making multiple queries or using SQL IN
			)
		)

	// Actually, let's do this properly with a raw query approach
	// For now, return empty - we'll fetch per-message
	return {}
}

// Get read status for a single message (for sender to see who read it)
export async function getMessageReadStatus(messageId: string, senderId: string) {
	const recipients = await db
		.select({
			recipientId: teamMessageRecipients.recipientId,
			recipientName: users.name,
			readAt: teamMessageRecipients.readAt,
		})
		.from(teamMessageRecipients)
		.innerJoin(users, eq(teamMessageRecipients.recipientId, users.id))
		.where(eq(teamMessageRecipients.messageId, messageId))

	// Filter out the sender from the recipients list
	const otherRecipients = recipients.filter(r => r.recipientId !== senderId)
	const readRecipients = otherRecipients.filter(r => r.readAt !== null)

	return {
		totalRecipients: otherRecipients.length,
		readCount: readRecipients.length,
		allRead: otherRecipients.length > 0 && readRecipients.length === otherRecipients.length,
		readBy: readRecipients.map(r => ({ name: r.recipientName, readAt: r.readAt })),
	}
}

// Upload chat image to blob storage
export async function uploadChatImage(formData: FormData): Promise<MessageAttachment> {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	const file = formData.get("file") as File
	if (!file || !file.type.startsWith("image/")) {
		throw new Error("Invalid image file")
	}

	// Max 10MB
	if (file.size > 10 * 1024 * 1024) {
		throw new Error("File too large (max 10MB)")
	}

	const blob = await put(`chat-images/${session.user.id}/${Date.now()}-${file.name}`, file, {
		access: "public",
	})

	return {
		type: "image",
		url: blob.url,
		name: file.name,
		size: file.size,
	}
}

// Fetch Open Graph data for a URL
export async function fetchLinkPreview(url: string): Promise<{
	title?: string
	description?: string
	image?: string
	favicon?: string
	siteName?: string
} | null> {
	try {
		// Basic validation
		const parsedUrl = new URL(url)
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			return null
		}

		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; Quickdash/1.0; +https://quickdash.coffee)",
			},
			signal: AbortSignal.timeout(5000),
		})

		if (!response.ok) return null

		const html = await response.text()

		// Parse Open Graph and meta tags
		const getMetaContent = (property: string): string | undefined => {
			const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"))
			if (ogMatch) return ogMatch[1]
			const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"))
			if (nameMatch) return nameMatch[1]
			// Reverse order (content before property)
			const ogReverseMatch = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i"))
			if (ogReverseMatch) return ogReverseMatch[1]
			return undefined
		}

		const title = getMetaContent("og:title") || getMetaContent("twitter:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
		const description = getMetaContent("og:description") || getMetaContent("twitter:description") || getMetaContent("description")
		const image = getMetaContent("og:image") || getMetaContent("twitter:image")
		const siteName = getMetaContent("og:site_name")

		// Get favicon
		const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']*)["']/i)
			|| html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon)["']/i)
		let favicon = faviconMatch?.[1]

		// Make relative URLs absolute
		if (favicon && !favicon.startsWith("http")) {
			favicon = new URL(favicon, parsedUrl.origin).href
		}
		if (!favicon) {
			favicon = `${parsedUrl.origin}/favicon.ico`
		}

		return {
			title: title?.trim(),
			description: description?.trim(),
			image: image ? (image.startsWith("http") ? image : new URL(image, parsedUrl.origin).href) : undefined,
			favicon,
			siteName: siteName?.trim(),
		}
	} catch {
		return null
	}
}

// --- INBOX ---
import { inboxEmails, inboxReplies } from "@quickdash/db/schema"
import { getWorkspaceResend, getWorkspaceEmailConfig } from "@/lib/resend"
import type { InboxEmail } from "./types"

export async function getInboxEmails(): Promise<InboxEmail[]> {
	const workspace = await requireWorkspace()
	// Get all emails with their replies for this workspace
	const emails = await db
		.select()
		.from(inboxEmails)
		.where(eq(inboxEmails.workspaceId, workspace.id))
		.orderBy(desc(inboxEmails.receivedAt))
		.limit(100)

	// Get replies for all emails
	const emailIds = emails.map(e => e.id)
	const replies = emailIds.length > 0
		? await db
				.select({
					id: inboxReplies.id,
					emailId: inboxReplies.emailId,
					senderName: inboxReplies.senderName,
					body: inboxReplies.body,
					sentAt: inboxReplies.sentAt,
				})
				.from(inboxReplies)
				.orderBy(asc(inboxReplies.sentAt))
		: []

	// Group replies by email ID
	const repliesByEmail = replies.reduce((acc, reply) => {
		if (!acc[reply.emailId]) acc[reply.emailId] = []
		acc[reply.emailId].push({
			id: reply.id,
			from: reply.senderName,
			body: reply.body,
			sentAt: reply.sentAt.toISOString(),
		})
		return acc
	}, {} as Record<string, { id: string; from: string; body: string; sentAt: string }[]>)

	return emails.map(email => ({
		id: email.id,
		fromName: email.fromName,
		fromEmail: email.fromEmail,
		subject: email.subject,
		body: email.body,
		receivedAt: email.receivedAt.toISOString(),
		status: email.status as "unread" | "read" | "replied",
		replies: repliesByEmail[email.id] || [],
	}))
}

export async function markInboxEmailRead(emailId: string) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	await db
		.update(inboxEmails)
		.set({
			status: "read",
			readAt: new Date(),
		})
		.where(
			and(
				eq(inboxEmails.id, emailId),
				eq(inboxEmails.workspaceId, workspace.id),
				eq(inboxEmails.status, "unread")
			)
		)
}

export async function sendInboxReply(data: { emailId: string; body: string }) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	// Get the original email
	const [email] = await db
		.select()
		.from(inboxEmails)
		.where(and(eq(inboxEmails.id, data.emailId), eq(inboxEmails.workspaceId, workspace.id)))
		.limit(1)

	if (!email) throw new Error("Email not found")

	// Get sender's name from database
	const [sender] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	const senderName = sender?.name || session.user.name || "Support"

	// Send email via workspace-scoped Resend
	let resendId: string | undefined
	const resend = await getWorkspaceResend(workspace.id)
	if (resend) {
		try {
			const emailConfig = await getWorkspaceEmailConfig(workspace.id)
			const fromAddress = emailConfig.fromName
				? `${senderName} <${emailConfig.fromEmail}>`
				: emailConfig.fromEmail

			const result = await resend.emails.send({
				from: fromAddress,
				to: email.fromEmail,
				...(emailConfig.replyTo ? { replyTo: emailConfig.replyTo } : {}),
				subject: `Re: ${email.subject}`,
				text: data.body,
				html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">
					<p>${data.body.replace(/\n/g, "<br>")}</p>
					<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
					<p style="color: #666; font-size: 12px;">
						${senderName}<br>
						${emailConfig.fromName || "Support"}
					</p>
				</div>`,
			})
			resendId = result.data?.id
		} catch (err) {
			console.error("Failed to send email via Resend:", err)
			// Continue anyway - save the reply even if email fails
		}
	}

	// Save the reply to database
	const [reply] = await db
		.insert(inboxReplies)
		.values({
			emailId: data.emailId,
			senderId: session.user.id,
			senderName,
			body: data.body,
			resendId,
			deliveryStatus: resendId ? "sent" : "failed",
		})
		.returning()

	// Update email status to replied
	await db
		.update(inboxEmails)
		.set({ status: "replied" })
		.where(eq(inboxEmails.id, data.emailId))

	return {
		id: reply.id,
		from: senderName,
		body: data.body,
		sentAt: reply.sentAt.toISOString(),
	}
}

export async function createInboxEmail(data: {
	fromName: string
	fromEmail: string
	subject: string
	body: string
	bodyHtml?: string
	source?: string
	sourceId?: string
	workspaceId?: string
}) {
	// workspaceId can be passed directly for webhooks, otherwise use current workspace
	let workspaceId = data.workspaceId
	if (!workspaceId) {
		const workspace = await requireWorkspace()
		workspaceId = workspace.id
	}

	const [email] = await db
		.insert(inboxEmails)
		.values({
			workspaceId,
			fromName: data.fromName,
			fromEmail: data.fromEmail,
			subject: data.subject,
			body: data.body,
			bodyHtml: data.bodyHtml,
			source: data.source || "contact_form",
			sourceId: data.sourceId,
		})
		.returning()

	return email
}

export async function archiveInboxEmail(emailId: string) {
	const workspace = await requireWorkspace()
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")

	await db
		.update(inboxEmails)
		.set({
			status: "archived" as any,
			archivedAt: new Date(),
		})
		.where(and(eq(inboxEmails.id, emailId), eq(inboxEmails.workspaceId, workspace.id)))
}

export async function getInboxUnreadCount() {
	const workspace = await requireWorkspace()
	const result = await db
		.select({ id: inboxEmails.id })
		.from(inboxEmails)
		.where(and(eq(inboxEmails.workspaceId, workspace.id), eq(inboxEmails.status, "unread")))
	return result.length
}
