import { createHmac, timingSafeEqual } from "crypto"
import type { WebhookProvider } from "./index"

/**
 * Verify Polar webhook signature
 * Polar uses HMAC-SHA256 with the webhook secret
 */
export function verifyPolarSignature(
	payload: string,
	signature: string,
	secret: string
): boolean {
	try {
		const expectedSignature = createHmac("sha256", secret)
			.update(payload)
			.digest("hex")

		// Polar sends signature as "sha256=<hex>"
		const actualSignature = signature.startsWith("sha256=")
			? signature.slice(7)
			: signature

		return timingSafeEqual(
			Buffer.from(expectedSignature),
			Buffer.from(actualSignature)
		)
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
