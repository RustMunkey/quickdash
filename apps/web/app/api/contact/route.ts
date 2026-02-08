import { NextResponse } from "next/server"
import { Resend } from "resend"
import { db } from "@quickdash/db/client"
import { inboxEmails, users, notifications } from "@quickdash/db/schema"
import Pusher from "pusher"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const pusher =
	process.env.PUSHER_APP_ID &&
	process.env.PUSHER_KEY &&
	process.env.PUSHER_SECRET &&
	process.env.PUSHER_CLUSTER
		? new Pusher({
				appId: process.env.PUSHER_APP_ID,
				key: process.env.PUSHER_KEY,
				secret: process.env.PUSHER_SECRET,
				cluster: process.env.PUSHER_CLUSTER,
				useTLS: true,
			})
		: null

export async function POST(request: Request) {
	try {
		const { name, email, subject, message } = await request.json()

		if (!name || !email || !subject || !message) {
			return NextResponse.json({ error: "All fields are required" }, { status: 400 })
		}

		// Save to inbox database
		const [inserted] = await db
			.insert(inboxEmails)
			.values({
				fromName: name,
				fromEmail: email,
				subject: subject,
				body: message,
				source: "contact_form",
			})
			.returning()

		// Broadcast to admin inbox
		if (pusher && inserted) {
			await pusher.trigger("private-inbox", "email:new", {
				id: inserted.id,
				fromName: name,
				fromEmail: email,
				subject: subject,
				body: message,
				receivedAt: inserted.receivedAt?.toISOString() || new Date().toISOString(),
				status: "unread",
			})

			// Create notifications for all admin users
			try {
				const adminUsers = await db.select({ id: users.id }).from(users)

				for (const user of adminUsers) {
					const [notification] = await db
						.insert(notifications)
						.values({
							userId: user.id,
							type: "inbox",
							title: `New message from ${name}`,
							body: subject,
							link: "/notifications/messages",
						})
						.returning()

					if (notification) {
						await pusher.trigger(`private-user-${user.id}`, "notification", {
							id: notification.id,
							type: "inbox",
							title: `New message from ${name}`,
							body: subject,
							link: "/notifications/messages",
							createdAt: notification.createdAt.toISOString(),
							readAt: null,
						})
					}
				}
			} catch (notifError) {
				console.error("[Contact Form] Failed to create notifications:", notifError)
			}
		}

		// If Resend not configured, just log and return success (for dev)
		if (!resend) {
			console.log("[Contact Form] Saved to inbox, Resend not configured")
			return NextResponse.json({ success: true, dev: true })
		}

		// Send confirmation to user
		try {
			await resend.emails.send({
				from: "Quickdash <noreply@quickdash.net>",
				to: [email],
				subject: "We received your message",
				text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you soon.\n\nBest,\nThe Quickdash Team`,
				html: `
					<div style="font-family: sans-serif; max-width: 600px;">
						<h2>Thanks for reaching out!</h2>
						<p>Hi ${name},</p>
						<p>We've received your message and will get back to you soon.</p>
						<p>Best,<br/>The Quickdash Team</p>
					</div>
				`,
			})
		} catch (emailError) {
			// Don't fail the whole request if confirmation email fails
			console.error("[Contact Form] Confirmation email failed:", emailError)
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("[Contact Form] Error:", error)
		return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
	}
}
