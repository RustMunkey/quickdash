import { db } from "@quickdash/db/client"
import { orders, users } from "@quickdash/db/schema"
import { eq } from "@quickdash/db/drizzle"
import { getWorkspaceResend, getWorkspaceEmailConfig } from "../resend"

type ShippingStatus = "shipped" | "out_for_delivery" | "delivered"

interface ShippingNotificationData {
	orderId: string
	workspaceId: string
	trackingNumber: string
	trackingUrl?: string
	carrierName?: string
	status: ShippingStatus
	estimatedDelivery?: string
	location?: string
}

// Get order with customer info
async function getOrderWithCustomer(orderId: string) {
	const [order] = await db
		.select({
			id: orders.id,
			orderNumber: orders.orderNumber,
			userId: orders.userId,
		})
		.from(orders)
		.where(eq(orders.id, orderId))
		.limit(1)

	if (!order) return null

	// Get customer info from users table
	let customerName = "Customer"
	let customerEmail: string | null = null

	if (order.userId) {
		const [customer] = await db
			.select({ name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, order.userId))
			.limit(1)
		if (customer) {
			customerName = customer.name || "Customer"
			customerEmail = customer.email
		}
	}

	return {
		id: order.id,
		orderNumber: order.orderNumber,
		customerName,
		email: customerEmail,
	}
}

// Email subject lines
const subjects: Record<ShippingStatus, (orderNumber: string) => string> = {
	shipped: (orderNumber) => `Your order #${orderNumber} has shipped!`,
	out_for_delivery: (orderNumber) => `Your order #${orderNumber} is out for delivery!`,
	delivered: (orderNumber) => `Your order #${orderNumber} has been delivered!`,
}

// Email templates
function getEmailContent(
	status: ShippingStatus,
	data: {
		storeName: string
		customerName: string
		orderNumber: string
		trackingNumber: string
		trackingUrl?: string
		carrierName?: string
		estimatedDelivery?: string
		location?: string
	}
) {
	const { storeName, customerName, orderNumber, trackingNumber, trackingUrl, carrierName, estimatedDelivery, location } = data
	const firstName = customerName?.split(" ")[0] || "there"
	const trackingLink = trackingUrl
		? `<a href="${trackingUrl}" style="color: #2563eb; text-decoration: underline;">Track your package</a>`
		: `Tracking number: <strong>${trackingNumber}</strong>`

	const templates: Record<ShippingStatus, { text: string; html: string }> = {
		shipped: {
			text: `Hi ${firstName},

Great news! Your order #${orderNumber} has shipped${carrierName ? ` via ${carrierName}` : ""}.

Tracking number: ${trackingNumber}
${trackingUrl ? `Track your package: ${trackingUrl}` : ""}
${estimatedDelivery ? `Estimated delivery: ${estimatedDelivery}` : ""}

Thanks for shopping with ${storeName}!

- The ${storeName} Team`,
			html: `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your order is on its way!</h1>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">
						Great news! Your order <strong>#${orderNumber}</strong> has shipped${carrierName ? ` via ${carrierName}` : ""}.
					</p>

					<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
						<p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">Tracking Information</p>
						<p style="margin: 0; font-size: 16px;">${trackingLink}</p>
						${estimatedDelivery ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">Estimated delivery: <strong>${estimatedDelivery}</strong></p>` : ""}
					</div>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">Thanks for shopping with ${storeName}!</p>

					<p style="font-size: 14px; color: #666; margin-top: 32px;">
						- The ${storeName} Team
					</p>
				</div>
			`,
		},
		out_for_delivery: {
			text: `Hi ${firstName},

Exciting news! Your order #${orderNumber} is out for delivery and should arrive today.

Tracking number: ${trackingNumber}
${trackingUrl ? `Track your package: ${trackingUrl}` : ""}
${location ? `Current location: ${location}` : ""}

Keep an eye out for your package!

- The ${storeName} Team`,
			html: `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your package is almost there!</h1>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">
						Exciting news! Your order <strong>#${orderNumber}</strong> is out for delivery and should arrive today.
					</p>

					<div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 24px 0;">
						<p style="margin: 0; font-size: 16px; color: #92400e;">
							Out for delivery${location ? ` - ${location}` : ""}
						</p>
					</div>

					<p style="font-size: 14px; color: #666;">${trackingLink}</p>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">Keep an eye out for your package!</p>

					<p style="font-size: 14px; color: #666; margin-top: 32px;">
						- The ${storeName} Team
					</p>
				</div>
			`,
		},
		delivered: {
			text: `Hi ${firstName},

Your order #${orderNumber} has been delivered!

We hope you enjoy your purchase. If you have any questions or concerns, don't hesitate to reach out.

Thanks for shopping with ${storeName}!

- The ${storeName} Team`,
			html: `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
					<h1 style="font-size: 24px; color: #111; margin-bottom: 24px;">Your order has arrived!</h1>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">Hi ${firstName},</p>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">
						Your order <strong>#${orderNumber}</strong> has been delivered!
					</p>

					<div style="background: #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0;">
						<p style="margin: 0; font-size: 16px; color: #065f46;">
							Delivered${location ? ` - ${location}` : ""}
						</p>
					</div>

					<p style="font-size: 16px; color: #333; line-height: 1.6;">
						We hope you enjoy your purchase! If you have any questions or concerns, feel free to reach out.
					</p>

					<p style="font-size: 14px; color: #666; margin-top: 32px;">
						- The ${storeName} Team
					</p>
				</div>
			`,
		},
	}

	return templates[status]
}

// Map internal status to notification status
export function mapToNotificationStatus(internalStatus: string): ShippingStatus | null {
	const statusMap: Record<string, ShippingStatus> = {
		// Shipped statuses
		in_transit: "shipped",
		label_created: "shipped",
		pre_transit: "shipped",
		// Out for delivery
		out_for_delivery: "out_for_delivery",
		// Delivered
		delivered: "delivered",
	}
	return statusMap[internalStatus] || null
}

// Send shipping notification email — fully workspace-scoped
export async function sendShippingNotification(data: ShippingNotificationData): Promise<{ success: boolean; error?: string }> {
	const resend = await getWorkspaceResend(data.workspaceId)
	if (!resend) {
		console.log(`[Shipping Notification] No Resend configured for workspace ${data.workspaceId}, skipping email`)
		return { success: false, error: "Resend not configured for this workspace" }
	}

	try {
		// Get order and customer info
		const order = await getOrderWithCustomer(data.orderId)
		if (!order) {
			console.warn(`[Shipping Notification] Order not found: ${data.orderId}`)
			return { success: false, error: "Order not found" }
		}

		if (!order.email) {
			console.warn(`[Shipping Notification] No email for order: ${data.orderId}`)
			return { success: false, error: "No customer email" }
		}

		// Get workspace email config for from address
		const emailConfig = await getWorkspaceEmailConfig(data.workspaceId)
		const storeName = emailConfig.fromName || "Your Store"
		const from = emailConfig.fromName
			? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
			: emailConfig.fromEmail

		const subject = subjects[data.status](order.orderNumber || "Unknown")
		const content = getEmailContent(data.status, {
			storeName,
			customerName: order.customerName || "Customer",
			orderNumber: order.orderNumber || "Unknown",
			trackingNumber: data.trackingNumber,
			trackingUrl: data.trackingUrl,
			carrierName: data.carrierName,
			estimatedDelivery: data.estimatedDelivery,
			location: data.location,
		})

		await resend.emails.send({
			from,
			to: [order.email],
			subject,
			text: content.text,
			html: content.html,
			...(emailConfig.replyTo ? { replyTo: emailConfig.replyTo } : {}),
		})

		console.log(`[Shipping Notification] Sent ${data.status} email to ${order.email} for order ${order.orderNumber} (workspace: ${data.workspaceId})`)
		return { success: true }
	} catch (error) {
		console.error("[Shipping Notification] Failed to send:", error)
		return { success: false, error: String(error) }
	}
}
