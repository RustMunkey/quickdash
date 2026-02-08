"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { createNotification } from "@/app/(dashboard)/settings/notifications/actions"
import { db } from "@quickdash/db/client"
import { orders, users } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireTestPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to run tests")
	}
	return workspace
}

// Test notification types
const NOTIFICATION_TEMPLATES = {
	order: {
		title: "New order received",
		body: "Order #JB-1234 for $49.99 from Test Customer",
		link: "/orders",
	},
	inventory: {
		title: "Low stock alert",
		body: "Ethiopian Yirgacheffe is running low (5 units remaining)",
		link: "/inventory",
	},
	payment: {
		title: "Payment received",
		body: "$149.99 payment confirmed for order #JB-1234",
		link: "/orders",
	},
	shipment: {
		title: "Shipment delivered",
		body: "Order #JB-1234 was delivered to Test Customer",
		link: "/orders",
	},
	system: {
		title: "System update",
		body: "Scheduled maintenance completed successfully",
		link: "/settings",
	},
}

export async function createTestNotification(type: keyof typeof NOTIFICATION_TEMPLATES) {
	const workspace = await requireTestPermission()
	const template = NOTIFICATION_TEMPLATES[type]

	const notification = await createNotification({
		userId: workspace.userId,
		type,
		title: template.title,
		body: template.body,
		link: template.link,
	})

	return { success: true, notification }
}

export async function createAllTestNotifications() {
	const workspace = await requireTestPermission()
	const results = []

	for (const [type, template] of Object.entries(NOTIFICATION_TEMPLATES)) {
		const notification = await createNotification({
			userId: workspace.userId,
			type,
			title: template.title,
			body: template.body,
			link: template.link,
		})
		results.push(notification)
	}

	return { success: true, count: results.length }
}

// Test shipping email - sends directly to current user without needing a real order
export async function sendTestShippingEmail(status: "shipped" | "out_for_delivery" | "delivered") {
	const workspace = await requireTestPermission()

	// Get user's email for testing
	const [dbUser] = await db
		.select({ email: users.email, name: users.name })
		.from(users)
		.where(eq(users.id, workspace.userId))
		.limit(1)

	if (!dbUser?.email) {
		return { success: false, error: "No email found for current user" }
	}

	// Import Resend directly for test emails
	const { Resend } = await import("resend")
	const resendKey = process.env.RESEND_API_KEY

	if (!resendKey) {
		return { success: false, error: "RESEND_API_KEY not configured" }
	}

	const resend = new Resend(resendKey)
	const firstName = dbUser.name?.split(" ")[0] || "there"
	const orderNumber = "JB-TEST-" + Date.now().toString().slice(-6)
	const trackingNumber = "1Z999AA10123456784"
	const trackingUrl = "https://www.ups.com/track?tracknum=1Z999AA10123456784"

	const subjects = {
		shipped: `Your order #${orderNumber} has shipped!`,
		out_for_delivery: `Your order #${orderNumber} is out for delivery!`,
		delivered: `Your order #${orderNumber} has been delivered!`,
	}

	const htmlTemplates = {
		shipped: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your order is on its way!</h1>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">
					Great news! Your order <strong>#${orderNumber}</strong> has shipped via UPS.
				</p>
				<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
					<p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Tracking Information</p>
					<p style="margin: 0; font-size: 16px;"><a href="${trackingUrl}" style="color: #2563eb; text-decoration: underline;">Track your package</a></p>
					<p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">Estimated delivery: <strong>January 30, 2026</strong></p>
				</div>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">Thanks for shopping with Quickdash!</p>
				<p style="font-size: 14px; color: #666; margin-top: 32px;">- The Quickdash Team</p>
			</div>
		`,
		out_for_delivery: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your package is almost there!</h1>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">
					Exciting news! Your order <strong>#${orderNumber}</strong> is out for delivery and should arrive today.
				</p>
				<div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0;">
					<p style="margin: 0; font-size: 16px; color: #92400e;">📦 Out for delivery • Local facility</p>
				</div>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">Keep an eye out for your package!</p>
				<p style="font-size: 14px; color: #666; margin-top: 32px;">- The Quickdash Team</p>
			</div>
		`,
		delivered: `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your order has arrived!</h1>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">
					Your order <strong>#${orderNumber}</strong> has been delivered!
				</p>
				<div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0;">
					<p style="margin: 0; font-size: 16px; color: #065f46;">✓ Delivered • Front door</p>
				</div>
				<p style="font-size: 16px; color: #333; line-height: 1.6;">We hope you enjoy your purchase!</p>
				<p style="font-size: 14px; color: #666; margin-top: 32px;">- The Quickdash Team</p>
			</div>
		`,
	}

	try {
		// Use real domain if verified, otherwise test sender
		// Note: onboarding@resend.dev can only send to the Resend account owner's email
		const fromEmail = "Quickdash <noreply@quickdash.net>"

		const result = await resend.emails.send({
			from: fromEmail,
			to: [dbUser.email],
			subject: `[TEST] ${subjects[status]}`,
			html: htmlTemplates[status],
		})

		console.log("[Test Shipping Email] Result:", JSON.stringify(result, null, 2))

		// Resend returns { data: { id }, error: null } on success
		// or { data: null, error: { ... } } on failure
		if (result.error) {
			console.error("[Test Shipping Email] Resend error:", result.error)
			return { success: false, error: result.error.message || "Resend API error" }
		}

		return { success: true, email: dbUser.email, id: result.data?.id }
	} catch (error: unknown) {
		console.error("[Test Shipping Email] Failed:", error)
		const errorMessage = error instanceof Error ? error.message : String(error)
		return { success: false, error: errorMessage }
	}
}

// Test inbox/contact form email
export async function createTestInboxEmail() {
	await requireTestPermission()

	const testEmails = [
		{
			name: "John Smith",
			email: "john.smith@example.com",
			subject: "Question about my order",
			message: "Hi there,\n\nI placed an order last week (#JB-1234) and was wondering when it will ship? I haven't received any tracking information yet.\n\nThanks,\nJohn",
		},
		{
			name: "Sarah Johnson",
			email: "sarah.j@gmail.com",
			subject: "Product inquiry - Ethiopian Yirgacheffe",
			message: "Hello!\n\nI'm interested in your Ethiopian Yirgacheffe coffee. Could you tell me more about the roast level and flavor profile? Is it suitable for pour-over brewing?\n\nBest regards,\nSarah",
		},
		{
			name: "Mike Chen",
			email: "mike.chen@company.org",
			subject: "Wholesale pricing",
			message: "Hi Quickdash team,\n\nI run a small cafe and I'm interested in carrying your coffee. Do you offer wholesale pricing? What's the minimum order quantity?\n\nLooking forward to hearing from you.\n\nMike Chen\nChen's Coffee House",
		},
	]

	// Pick a random email
	const testEmail = testEmails[Math.floor(Math.random() * testEmails.length)]

	// Call the inbound email endpoint
	const response = await fetch(`${process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"}/api/webhooks/inbound/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			type: "contact_form",
			name: testEmail.name,
			email: testEmail.email,
			subject: testEmail.subject,
			message: testEmail.message,
		}),
	})

	if (!response.ok) {
		const error = await response.text()
		return { success: false, error }
	}

	const result = await response.json()
	return { success: true, ...result, from: testEmail.name }
}

// Get test order for email testing
export async function getTestOrders() {
	const workspace = await requireTestPermission()

	const testOrders = await db
		.select({
			id: orders.id,
			orderNumber: orders.orderNumber,
			status: orders.status,
			trackingNumber: orders.trackingNumber,
		})
		.from(orders)
		.where(eq(orders.workspaceId, workspace.id))
		.limit(10)

	return testOrders
}
