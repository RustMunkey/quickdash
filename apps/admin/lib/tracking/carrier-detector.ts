/**
 * Carrier Auto-Detection
 *
 * Detects carrier from tracking number format and generates tracking URLs.
 */

export interface CarrierInfo {
	code: string
	name: string
	trackingUrl: string
}

interface CarrierPattern {
	code: string
	name: string
	patterns: RegExp[]
	trackingUrlTemplate: string
}

const CARRIERS: CarrierPattern[] = [
	{
		code: "usps",
		name: "USPS",
		patterns: [
			// USPS Tracking: 20-22 digits
			/^(94|93|92|91|90|89|88|87|86|85|84|83|82|81|80|79|78|77|76|75|74|73|72|71|70)\d{18,20}$/,
			// USPS Tracking: 13 characters (international)
			/^[A-Z]{2}\d{9}[A-Z]{2}$/,
			// USPS Tracking: 20 digits starting with specific prefixes
			/^\d{20,22}$/,
		],
		trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}",
	},
	{
		code: "ups",
		name: "UPS",
		patterns: [
			// UPS: 1Z + 16 alphanumeric
			/^1Z[A-Z0-9]{16}$/i,
			// UPS: T + 10 digits (Mail Innovations)
			/^T\d{10}$/,
			// UPS: 9 digits
			/^\d{9}$/,
		],
		trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}",
	},
	{
		code: "fedex",
		name: "FedEx",
		patterns: [
			// FedEx Express/Ground: 12 digits
			/^\d{12}$/,
			// FedEx Express/Ground: 15 digits
			/^\d{15}$/,
			// FedEx Ground: 20-22 digits (96/98 prefix)
			/^(96|98)\d{18,20}$/,
			// FedEx SmartPost: 22 digits
			/^\d{22}$/,
		],
		trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking}",
	},
	{
		code: "dhl",
		name: "DHL",
		patterns: [
			// DHL Express: 10 digits
			/^\d{10}$/,
			// DHL Express: starts with JD + 18 digits
			/^JD\d{18}$/,
			// DHL eCommerce: 16-24 alphanumeric
			/^[A-Z0-9]{16,24}$/i,
		],
		trackingUrlTemplate: "https://www.dhl.com/en/express/tracking.html?AWB={tracking}",
	},
	{
		code: "ontrac",
		name: "OnTrac",
		patterns: [
			// OnTrac: C + 14 digits
			/^C\d{14}$/,
			// OnTrac: D + 14 digits
			/^D\d{14}$/,
		],
		trackingUrlTemplate: "https://www.ontrac.com/tracking/?number={tracking}",
	},
	{
		code: "lasership",
		name: "LaserShip",
		patterns: [
			// LaserShip: 1LS + alphanumeric
			/^1LS[A-Z0-9]+$/i,
			// LaserShip: LX + digits
			/^LX\d+$/,
		],
		trackingUrlTemplate: "https://www.lasership.com/track/{tracking}",
	},
	{
		code: "amazon",
		name: "Amazon Logistics",
		patterns: [
			// Amazon: TBA + digits
			/^TBA\d+$/,
		],
		trackingUrlTemplate: "https://track.amazon.com/tracking/{tracking}",
	},
]

/**
 * Detect carrier from tracking number
 * Returns carrier info or null if unknown
 */
export function detectCarrier(trackingNumber: string): CarrierInfo | null {
	const cleaned = trackingNumber.trim().toUpperCase().replace(/\s+/g, "")

	for (const carrier of CARRIERS) {
		for (const pattern of carrier.patterns) {
			if (pattern.test(cleaned)) {
				return {
					code: carrier.code,
					name: carrier.name,
					trackingUrl: carrier.trackingUrlTemplate.replace("{tracking}", cleaned),
				}
			}
		}
	}

	return null
}

/**
 * Generate tracking URL for a known carrier
 */
export function getTrackingUrl(carrierCode: string, trackingNumber: string): string | null {
	const carrier = CARRIERS.find((c) => c.code === carrierCode.toLowerCase())
	if (!carrier) return null

	const cleaned = trackingNumber.trim().toUpperCase().replace(/\s+/g, "")
	return carrier.trackingUrlTemplate.replace("{tracking}", cleaned)
}

/**
 * Get all supported carriers
 */
export function getSupportedCarriers(): Array<{ code: string; name: string }> {
	return CARRIERS.map((c) => ({ code: c.code, name: c.name }))
}

/**
 * Validate tracking number format for a specific carrier
 */
export function validateTrackingNumber(carrierCode: string, trackingNumber: string): boolean {
	const carrier = CARRIERS.find((c) => c.code === carrierCode.toLowerCase())
	if (!carrier) return false

	const cleaned = trackingNumber.trim().toUpperCase().replace(/\s+/g, "")
	return carrier.patterns.some((pattern) => pattern.test(cleaned))
}

/**
 * Extract tracking numbers from text (for email parsing)
 * Returns array of potential tracking numbers with detected carriers
 */
export function extractTrackingNumbers(text: string): Array<{ trackingNumber: string; carrier: CarrierInfo | null }> {
	const results: Array<{ trackingNumber: string; carrier: CarrierInfo | null }> = []

	// Common patterns that might be tracking numbers
	const potentialPatterns = [
		/\b1Z[A-Z0-9]{16}\b/gi, // UPS
		/\b(94|93|92|91|90)\d{18,20}\b/g, // USPS
		/\b\d{12}\b/g, // FedEx 12
		/\b\d{15}\b/g, // FedEx 15
		/\b\d{20,22}\b/g, // USPS/FedEx long
		/\bTBA\d+\b/gi, // Amazon
		/\b[A-Z]{2}\d{9}[A-Z]{2}\b/g, // International
	]

	const seen = new Set<string>()

	for (const pattern of potentialPatterns) {
		const matches = text.match(pattern) || []
		for (const match of matches) {
			const cleaned = match.trim().toUpperCase()
			if (!seen.has(cleaned)) {
				seen.add(cleaned)
				results.push({
					trackingNumber: cleaned,
					carrier: detectCarrier(cleaned),
				})
			}
		}
	}

	return results
}
