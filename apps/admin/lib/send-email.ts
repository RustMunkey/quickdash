import { eq, and } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { emailTemplates, messages, workspaceIntegrations } from "@quickdash/db/schema"
import { getResend, getWorkspaceResend, getWorkspaceEmailConfig } from "./resend"

type SendTemplateEmailOptions = {
	to: string
	templateSlug: string
	variables?: Record<string, string>
	sentBy?: string
	recipientId?: string
	workspaceId?: string // Optional - if provided, uses workspace-specific config
}

export async function sendTemplateEmail({
	to,
	templateSlug,
	variables = {},
	sentBy,
	recipientId,
	workspaceId,
}: SendTemplateEmailOptions) {
	// Get Resend instance (workspace-specific or default)
	const resend = workspaceId ? await getWorkspaceResend(workspaceId) : getResend()
	if (!resend) return null

	const [template] = await db
		.select()
		.from(emailTemplates)
		.where(eq(emailTemplates.slug, templateSlug))
		.limit(1)

	if (!template || !template.isActive) return null

	// Replace variables in subject and body
	let subject = template.subject
	let body = template.body || ""

	for (const [key, value] of Object.entries(variables)) {
		const placeholder = `{{${key}}}`
		subject = subject.replaceAll(placeholder, value)
		body = body.replaceAll(placeholder, value)
	}

	// Get email config (workspace-specific or default)
	const emailConfig = workspaceId
		? await getWorkspaceEmailConfig(workspaceId)
		: { fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@quickdash.app" }

	// Format "from" address
	const from = emailConfig.fromName
		? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
		: emailConfig.fromEmail

	const result = await resend.emails.send({
		from,
		to,
		subject,
		html: body,
		replyTo: emailConfig.replyTo,
	})

	// Log to messages table
	await db.insert(messages).values({
		templateId: template.id,
		recipientEmail: to,
		recipientId: recipientId || null,
		subject,
		body,
		status: result.error ? "failed" : "sent",
		sentBy: sentBy || null,
	})

	return result
}

type SendEmailOptions = {
	to: string | string[]
	subject: string
	html?: string
	text?: string
	replyTo?: string
	workspaceId?: string
}

/**
 * Send a direct email (not using a template)
 */
export async function sendEmail({
	to,
	subject,
	html,
	text,
	replyTo,
	workspaceId,
}: SendEmailOptions) {
	const recipients = Array.isArray(to) ? to : [to]
	const messageBody = html || text || ""
	const messageRows = workspaceId
		? await db.insert(messages).values(recipients.map((recipientEmail) => ({
			workspaceId,
			recipientEmail,
			subject,
			body: messageBody,
			status: "pending",
		}))).returning({ id: messages.id })
		: []

	const setMessageStatus = async (status: "sent" | "failed") => {
		await Promise.all(messageRows.map((message) =>
			db.update(messages).set({ status }).where(eq(messages.id, message.id))
		))
	}

	const setIntegrationResult = async (errorMessage?: string) => {
		if (!workspaceId) return
		await db
			.update(workspaceIntegrations)
			.set({
				lastUsedAt: new Date(),
				lastError: errorMessage || null,
			})
			.where(and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "resend")
			))
	}

	const resend = workspaceId ? await getWorkspaceResend(workspaceId) : getResend()
	if (!resend) {
		await setMessageStatus("failed")
		await setIntegrationResult("Email service is not configured")
		throw new Error("Email service is not configured")
	}

	const emailConfig = workspaceId
		? await getWorkspaceEmailConfig(workspaceId)
		: { fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@quickdash.app" }

	const from = emailConfig.fromName
		? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
		: emailConfig.fromEmail

	const finalReplyTo = replyTo || emailConfig.replyTo

	try {
		const result = await resend.emails.send({
			from,
			to,
			subject,
			html: messageBody,
			...(text && { text }),
			...(finalReplyTo && { replyTo: finalReplyTo }),
		})

		if (result.error) throw new Error(result.error.message)
		await setMessageStatus("sent")
		await setIntegrationResult()
		return result
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown Resend error"
		await setMessageStatus("failed")
		await setIntegrationResult(message)
		throw error
	}
}
