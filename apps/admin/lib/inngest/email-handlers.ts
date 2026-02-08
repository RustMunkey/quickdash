import { inngest } from "../inngest"
import { db } from "@quickdash/db"
import { emailTemplates, messages } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"
import { getResend } from "../resend"
import { isDuplicate } from "../redis"

/**
 * Send a template email via Inngest queue
 * Provides automatic retries, rate limiting, and deduplication
 */
export const sendQueuedEmail = inngest.createFunction(
	{
		id: "send-queued-email",
		retries: 3,
		// Concurrency limit to avoid overwhelming email service
		concurrency: {
			limit: 5,
		},
	},
	{ event: "email/send" },
	async ({ event, step }) => {
		const {
			to,
			templateSlug,
			variables = {},
			sentBy,
			recipientId,
			workspaceId,
			// Deduplication key - if provided, prevents sending same email twice within 5 minutes
			deduplicationKey,
		} = event.data as {
			to: string
			templateSlug: string
			variables?: Record<string, string>
			sentBy?: string
			recipientId?: string
			workspaceId?: string
			deduplicationKey?: string
		}

		// Check for duplicate if key provided
		if (deduplicationKey) {
			const isDupe = await step.run("check-duplicate", async () => {
				return isDuplicate(`email:${deduplicationKey}`, 300) // 5 minute window
			})
			if (isDupe) {
				return { success: true, skipped: true, reason: "Duplicate email detected" }
			}
		}

		const resend = getResend()
		if (!resend) {
			return { success: false, error: "Email service not configured" }
		}

		// Get template
		const template = await step.run("get-template", async () => {
			const [t] = await db
				.select()
				.from(emailTemplates)
				.where(eq(emailTemplates.slug, templateSlug))
				.limit(1)
			return t
		})

		if (!template || !template.isActive) {
			return { success: false, error: `Template not found or inactive: ${templateSlug}` }
		}

		// Replace variables in subject and body
		let subject = template.subject
		let body = template.body || ""

		for (const [key, value] of Object.entries(variables)) {
			const placeholder = `{{${key}}}`
			subject = subject.replaceAll(placeholder, value)
			body = body.replaceAll(placeholder, value)
		}

		// Send the email
		const result = await step.run("send-email", async () => {
			const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@quickdash.app"

			return resend.emails.send({
				from: fromEmail,
				to,
				subject,
				html: body,
			})
		})

		// Log to messages table
		await step.run("log-message", async () => {
			await db.insert(messages).values({
				templateId: template.id,
				recipientEmail: to,
				recipientId: recipientId || null,
				subject,
				body,
				status: result.error ? "failed" : "sent",
				sentBy: sentBy || null,
			})
		})

		if (result.error) {
			throw new Error(`Email send failed: ${result.error.message}`)
		}

		return {
			success: true,
			emailId: result.data?.id,
			to,
			subject,
		}
	}
)

/**
 * Send a direct email (non-template) via Inngest queue
 */
export const sendDirectEmail = inngest.createFunction(
	{
		id: "send-direct-email",
		retries: 3,
		concurrency: {
			limit: 5,
		},
	},
	{ event: "email/send-direct" },
	async ({ event, step }) => {
		const {
			from,
			to,
			replyTo,
			subject,
			text,
			html,
			deduplicationKey,
		} = event.data as {
			from: string
			to: string
			replyTo?: string
			subject: string
			text?: string
			html?: string
			deduplicationKey?: string
		}

		// Check for duplicate if key provided
		if (deduplicationKey) {
			const isDupe = await step.run("check-duplicate", async () => {
				return isDuplicate(`email:${deduplicationKey}`, 300)
			})
			if (isDupe) {
				return { success: true, skipped: true, reason: "Duplicate email detected" }
			}
		}

		const resend = getResend()
		if (!resend) {
			return { success: false, error: "Email service not configured" }
		}

		const result = await step.run("send-email", async () => {
			return resend.emails.send({
				from,
				to,
				subject,
				html: html || text || "",
				...(text && { text }),
				...(replyTo && { replyTo }),
			})
		})

		if (result.error) {
			throw new Error(`Email send failed: ${result.error.message}`)
		}

		return {
			success: true,
			emailId: result.data?.id,
			to,
			subject,
		}
	}
)

export const emailHandlers = [
	sendQueuedEmail,
	sendDirectEmail,
]
