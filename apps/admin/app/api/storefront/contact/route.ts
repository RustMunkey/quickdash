import type { NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { and, eq } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import { sendEmail } from "@/lib/send-email"
import { getWorkspaceEmailConfig } from "@/lib/resend"
import { checkRateLimit } from "@/lib/redis"
import {
	handleCorsOptions,
	storefrontError,
	storefrontJson,
	type StorefrontContext,
	withStorefrontAuth,
} from "@/lib/storefront-auth"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(value: unknown): string {
	return typeof value === "string" ? value.trim() : ""
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
	const clientAddress = forwardedFor || request.headers.get("x-real-ip") || "unknown"
	const rateLimit = await checkRateLimit(
		`storefront-contact:${storefront.workspaceId}:${clientAddress}`,
		5,
		60 * 60
	)

	if (!rateLimit.success) {
		return storefrontError("Too many messages. Please try again later.", 429)
	}

	let body: Record<string, unknown>
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const name = cleanText(body.name)
	const email = cleanText(body.email).toLowerCase()
	const subject = cleanText(body.subject)
	const message = cleanText(body.message)

	if (!name || name.length > 100) return storefrontError("Enter your name", 400)
	if (!EMAIL_PATTERN.test(email) || email.length > 254) {
		return storefrontError("Enter a valid email address", 400)
	}
	if (!subject || subject.length > 160) return storefrontError("Enter a subject", 400)
	if (message.length < 10 || message.length > 5000) {
		return storefrontError("Message must be between 10 and 5,000 characters", 400)
	}

	const [collection] = await db
		.select({ id: contentCollections.id })
		.from(contentCollections)
		.where(and(
			eq(contentCollections.workspaceId, storefront.workspaceId),
			eq(contentCollections.slug, "contact-submissions"),
			eq(contentCollections.isActive, true)
		))
		.limit(1)

	if (!collection) {
		return storefrontError("Contact submissions are not configured", 503)
	}

	const submittedAt = new Date().toISOString()
	const [entry] = await db
		.insert(contentEntries)
		.values({
			collectionId: collection.id,
			workspaceId: storefront.workspaceId,
			data: { name, email, subject, message, status: "new", source: "storefront", submittedAt },
			isActive: false,
		})
		.returning({ id: contentEntries.id })

	const emailConfig = await getWorkspaceEmailConfig(storefront.workspaceId)
	if (!emailConfig.replyTo) {
		return storefrontError("Contact email delivery is not configured", 503)
	}

	try {
		await sendEmail({
			to: emailConfig.replyTo,
			replyTo: email,
			subject: `[${storefront.name}] ${subject}`,
			workspaceId: storefront.workspaceId,
			html: `
				<h2>New storefront message</h2>
				<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
				<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
				<hr />
				<p style="white-space: pre-wrap">${escapeHtml(message)}</p>
			`,
			text: `New storefront message\n\nFrom: ${name} (${email})\nSubject: ${subject}\n\n${message}`,
		})
	} catch (error) {
		console.error("Failed to deliver storefront contact message:", error)
		return storefrontError("Your message was saved, but email delivery failed", 503)
	}

	return storefrontJson({ submissionId: entry.id }, 201)
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
