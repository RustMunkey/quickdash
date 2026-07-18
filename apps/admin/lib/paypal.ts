export type PayPalMode = "sandbox" | "live"

export type PayPalCredentials = {
	clientId: string
	clientSecret: string
	mode: PayPalMode
}

export async function getPayPalAccessToken(creds: PayPalCredentials): Promise<string> {
	const response = await fetch(`${getPayPalBaseUrl(creds.mode)}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
		},
		body: "grant_type=client_credentials",
	})

	if (!response.ok) {
		throw new Error(`PayPal authentication failed (${response.status})`)
	}

	const data = await response.json() as { access_token?: string }
	if (!data.access_token) throw new Error("PayPal did not return an access token")
	return data.access_token
}

export function getPayPalBaseUrl(mode: PayPalMode): string {
	return mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"
}

export async function getPayPalOrder(creds: PayPalCredentials, orderId: string) {
	const accessToken = await getPayPalAccessToken(creds)
	const response = await fetch(`${getPayPalBaseUrl(creds.mode)}/v2/checkout/orders/${orderId}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
		cache: "no-store",
	})

	if (!response.ok) throw new Error(`Unable to verify PayPal order (${response.status})`)
	return response.json()
}

export async function verifyCompletedPayPalCapture(
	creds: PayPalCredentials,
	paypalOrderId: string,
	expectedCaptureId: string
) {
	const order = await getPayPalOrder(creds, paypalOrderId)
	const capture = order.purchase_units?.[0]?.payments?.captures?.find(
		(candidate: { id?: string }) => candidate.id === expectedCaptureId
	)

	if (!capture || capture.status !== "COMPLETED") {
		throw new Error("PayPal payment is not completed")
	}

	return {
		captureId: capture.id as string,
		amount: String(capture.amount?.value || ""),
		currency: String(capture.amount?.currency_code || "").toUpperCase(),
		paypalOrderId: String(order.id || paypalOrderId),
	}
}
