import { createHmac, timingSafeEqual } from "crypto"
import type { WebhookProvider } from "./index"

/**
 * Verify Polar webhook signature
 * Polar uses Standard Webhooks (Svix) format:
 * - Headers: webhook-id, webhook-timestamp, webhook-signature
 * - Secret: base64-encoded after prefix (whsec_ or polar_whs_)
 * - Signed content: "${id}.${timestamp}.${body}"
 * - Signature format: "v1,<base64>"
 */
export function verifyPolarSignature(
	payload: string,
	headers: { id: string; timestamp: string; signature: string },
	secret: string
): boolean {
	try {
		// Decode the secret: strip prefix and base64-decode
		const parts = secret.split("_")
		const secretBase64 = parts[parts.length - 1]
		const secretBytes = Buffer.from(secretBase64, "base64")

		// Standard Webhooks signed content: "${msg_id}.${timestamp}.${body}"
		const signedContent = `${headers.id}.${headers.timestamp}.${payload}`

		const expectedSignature = createHmac("sha256", secretBytes)
			.update(signedContent)
			.digest("base64")

		// Signature header: space-separated "v1,<base64>" entries
		const signatures = headers.signature.split(" ")
		for (const sig of signatures) {
			const [version, sigValue] = sig.split(",")
			if (version === "v1" && sigValue) {
				try {
					if (
						timingSafeEqual(
							Buffer.from(expectedSignature),
							Buffer.from(sigValue)
						)
					) {
						return true
					}
				} catch {
					continue
				}
			}
		}

		return false
	} catch {
		return false
	}
}

/**
 * Verify Resend webhook signature
 * Resend uses HMAC-SHA256 with svix format
 */
export function verifyResendSignature(
	payload: string,
	svixId: string,
	svixTimestamp: string,
	svixSignature: string,
	secret: string
): boolean {
	try {
		// Resend uses Svix for webhooks
		// Signature format: "v1,<base64-signature>"
		const signedContent = `${svixId}.${svixTimestamp}.${payload}`

		// Secret is base64 encoded with "whsec_" prefix
		const secretKey = secret.startsWith("whsec_")
			? Buffer.from(secret.slice(6), "base64")
			: Buffer.from(secret, "base64")

		const expectedSignature = createHmac("sha256", secretKey)
			.update(signedContent)
			.digest("base64")

		// Parse signature versions
		const signatures = svixSignature.split(" ")
		for (const sig of signatures) {
			const [version, sigValue] = sig.split(",")
			if (version === "v1") {
				try {
					if (
						timingSafeEqual(
							Buffer.from(expectedSignature),
							Buffer.from(sigValue)
						)
					) {
						return true
					}
				} catch {
					continue
				}
			}
		}

		return false
	} catch {
		return false
	}
}

/**
 * Generic HMAC-SHA256 verification for supplier webhooks
 */
export function verifyHmacSignature(
	payload: string,
	signature: string,
	secret: string,
	algorithm: "sha256" | "sha512" = "sha256"
): boolean {
	try {
		const expectedSignature = createHmac(algorithm, secret)
			.update(payload)
			.digest("hex")

		return timingSafeEqual(
			Buffer.from(expectedSignature),
			Buffer.from(signature)
		)
	} catch {
		return false
	}
}

/**
 * Verify timestamp is within tolerance (prevent replay attacks)
 */
export function verifyTimestamp(
	timestamp: string | number,
	toleranceSeconds: number = 300
): boolean {
	const webhookTime = typeof timestamp === "string"
		? parseInt(timestamp, 10)
		: timestamp

	const now = Math.floor(Date.now() / 1000)
	const diff = Math.abs(now - webhookTime)

	return diff <= toleranceSeconds
}

/**
 * Get the appropriate signature verification function for a provider
 */
export function getVerifier(provider: WebhookProvider) {
	switch (provider) {
		case "polar":
			return verifyPolarSignature
		case "resend":
			return verifyResendSignature
		case "supplier":
			return verifyHmacSignature
		default:
			throw new Error(`Unknown webhook provider: ${provider}`)
	}
}
