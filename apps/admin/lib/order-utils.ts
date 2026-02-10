import { nanoid } from "nanoid"

export function generateOrderNumber(): string {
	const timestamp = Date.now().toString(36).toUpperCase()
	const random = nanoid(4).toUpperCase()
	return `ORD-${timestamp}-${random}`
}

type OrderEmailData = {
	orderNumber: string
	customerName: string
	items: { name: string; quantity: number; unitPrice: number }[]
	subtotal: number
	discount: number
	tax: number
	shipping: number
	total: number
	currency: string
	shippingAddress?: {
		firstName?: string
		lastName?: string
		addressLine1?: string
		city?: string
		state?: string
		postalCode?: string
		country?: string
	}
	paymentMethod?: string
}

export function buildOrderConfirmationEmail(data: OrderEmailData): { subject: string; html: string } {
	const currencySymbol = data.currency === "USD" ? "$" : data.currency === "CAD" ? "CA$" : data.currency === "EUR" ? "€" : data.currency === "GBP" ? "£" : `${data.currency} `
	const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`

	const itemRows = data.items
		.map(
			(item) => `
		<tr>
			<td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice)}</td>
			<td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.unitPrice * item.quantity)}</td>
		</tr>`
		)
		.join("")

	const addr = data.shippingAddress
	const addressBlock = addr
		? `<p style="margin:4px 0;color:#555;">${[addr.firstName, addr.lastName].filter(Boolean).join(" ")}<br/>${addr.addressLine1 || ""}<br/>${[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}<br/>${addr.country || ""}</p>`
		: ""

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
	<div style="max-width:600px;margin:0 auto;padding:24px;">
		<div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
			<div style="padding:24px 24px 16px;">
				<h1 style="margin:0 0 4px;font-size:20px;color:#111;">Order Confirmed</h1>
				<p style="margin:0;color:#666;font-size:14px;">Order #${data.orderNumber}</p>
			</div>
			<div style="padding:0 24px;">
				<p style="color:#333;font-size:14px;">Hi ${data.customerName},</p>
				<p style="color:#555;font-size:14px;">Thank you for your order. Here's a summary:</p>
				<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
					<thead>
						<tr style="background:#f9fafb;">
							<th style="padding:8px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Item</th>
							<th style="padding:8px 12px;text-align:center;font-weight:600;border-bottom:2px solid #e5e7eb;">Qty</th>
							<th style="padding:8px 12px;text-align:right;font-weight:600;border-bottom:2px solid #e5e7eb;">Price</th>
							<th style="padding:8px 12px;text-align:right;font-weight:600;border-bottom:2px solid #e5e7eb;">Total</th>
						</tr>
					</thead>
					<tbody>${itemRows}</tbody>
				</table>
				<table style="width:100%;font-size:14px;margin:0 0 16px;">
					<tr><td style="padding:4px 12px;color:#555;">Subtotal</td><td style="padding:4px 12px;text-align:right;">${fmt(data.subtotal)}</td></tr>
					${data.discount > 0 ? `<tr><td style="padding:4px 12px;color:#16a34a;">Discount</td><td style="padding:4px 12px;text-align:right;color:#16a34a;">-${fmt(data.discount)}</td></tr>` : ""}
					${data.tax > 0 ? `<tr><td style="padding:4px 12px;color:#555;">Tax</td><td style="padding:4px 12px;text-align:right;">${fmt(data.tax)}</td></tr>` : ""}
					${data.shipping > 0 ? `<tr><td style="padding:4px 12px;color:#555;">Shipping</td><td style="padding:4px 12px;text-align:right;">${fmt(data.shipping)}</td></tr>` : ""}
					<tr style="font-weight:700;"><td style="padding:8px 12px;border-top:2px solid #e5e7eb;">Total</td><td style="padding:8px 12px;text-align:right;border-top:2px solid #e5e7eb;">${fmt(data.total)}</td></tr>
				</table>
				${addr ? `<div style="margin:16px 0;padding:12px;background:#f9fafb;border-radius:6px;"><p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#333;">Shipping Address</p>${addressBlock}</div>` : ""}
				${data.paymentMethod ? `<p style="font-size:13px;color:#555;margin:8px 0;">Paid via <strong>${data.paymentMethod}</strong></p>` : ""}
			</div>
			<div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
				<p style="margin:0;font-size:12px;color:#999;">If you have questions about your order, reply to this email.</p>
			</div>
		</div>
	</div>
</body>
</html>`

	return {
		subject: `Order Confirmed — #${data.orderNumber}`,
		html,
	}
}
