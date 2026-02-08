/**
 * Shippo Integration (Platform-Level)
 *
 * Label generation service using platform's Shippo API key.
 * Users don't need their own Shippo account - Quickdash provides this as infrastructure.
 */

const SHIPPO_API_URL = "https://api.goshippo.com"

function getShippoApiKey(): string {
	const key = process.env.SHIPPO_API_KEY
	if (!key) {
		throw new Error("SHIPPO_API_KEY environment variable is not set")
	}
	return key
}

async function shippoRequest<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	const response = await fetch(`${SHIPPO_API_URL}${endpoint}`, {
		...options,
		headers: {
			"Authorization": `ShippoToken ${getShippoApiKey()}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	})

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: response.statusText }))
		throw new Error(error.detail || error.message || "Shippo API error")
	}

	return response.json()
}

// ============================================
// Types
// ============================================

export interface ShippoAddress {
	name: string
	company?: string
	street1: string
	street2?: string
	city: string
	state: string
	zip: string
	country: string // ISO 2-letter code (US, CA, etc.)
	phone?: string
	email?: string
}

export interface ShippoParcel {
	length: number
	width: number
	height: number
	distance_unit: "in" | "cm"
	weight: number
	mass_unit: "lb" | "kg" | "oz" | "g"
}

export interface ShippoRate {
	object_id: string
	provider: string // "USPS", "UPS", "FedEx", etc.
	servicelevel: {
		name: string // "Priority Mail", "Ground", etc.
		token: string
	}
	amount: string
	currency: string
	estimated_days: number
	duration_terms: string
}

export interface ShippoShipment {
	object_id: string
	status: string
	address_from: ShippoAddress
	address_to: ShippoAddress
	parcels: ShippoParcel[]
	rates: ShippoRate[]
}

export interface ShippoTransaction {
	object_id: string
	status: "SUCCESS" | "ERROR" | "QUEUED" | "WAITING"
	tracking_number: string
	tracking_url_provider: string
	label_url: string
	commercial_invoice_url?: string
	rate: ShippoRate
	messages: Array<{ text: string }>
}

export interface ShippoAddressValidation {
	is_valid: boolean
	messages: Array<{ text: string; type: string }>
}

// ============================================
// Address Validation
// ============================================

export async function validateAddress(address: ShippoAddress): Promise<ShippoAddressValidation> {
	const result = await shippoRequest<any>("/addresses", {
		method: "POST",
		body: JSON.stringify({
			...address,
			validate: true,
		}),
	})

	return {
		is_valid: result.validation_results?.is_valid ?? false,
		messages: result.validation_results?.messages ?? [],
	}
}

// ============================================
// Get Shipping Rates
// ============================================

export async function getShippingRates(
	addressFrom: ShippoAddress,
	addressTo: ShippoAddress,
	parcel: ShippoParcel
): Promise<{ shipmentId: string; rates: ShippoRate[] }> {
	const shipment = await shippoRequest<ShippoShipment>("/shipments", {
		method: "POST",
		body: JSON.stringify({
			address_from: addressFrom,
			address_to: addressTo,
			parcels: [parcel],
			async: false, // Wait for rates
		}),
	})

	// Sort rates by price
	const sortedRates = shipment.rates.sort(
		(a, b) => parseFloat(a.amount) - parseFloat(b.amount)
	)

	return {
		shipmentId: shipment.object_id,
		rates: sortedRates,
	}
}

// ============================================
// Purchase Label
// ============================================

export async function purchaseLabel(rateId: string): Promise<ShippoTransaction> {
	const transaction = await shippoRequest<ShippoTransaction>("/transactions", {
		method: "POST",
		body: JSON.stringify({
			rate: rateId,
			label_file_type: "PDF",
			async: false,
		}),
	})

	if (transaction.status === "ERROR") {
		const errorMsg = transaction.messages?.[0]?.text || "Failed to purchase label"
		throw new Error(errorMsg)
	}

	return transaction
}

// ============================================
// Create Shipment and Buy Label (All-in-One)
// ============================================

export async function createLabelForOrder(
	addressFrom: ShippoAddress,
	addressTo: ShippoAddress,
	parcel: ShippoParcel,
	serviceLevel?: string // Optional: specific service like "usps_priority"
): Promise<{
	trackingNumber: string
	trackingUrl: string
	labelUrl: string
	carrier: string
	service: string
	cost: string
	currency: string
}> {
	// Get rates
	const { rates } = await getShippingRates(addressFrom, addressTo, parcel)

	if (rates.length === 0) {
		throw new Error("No shipping rates available for this route")
	}

	// Find requested service or use cheapest
	let selectedRate = rates[0] // Default to cheapest
	if (serviceLevel) {
		const requested = rates.find(
			(r) => r.servicelevel.token.toLowerCase() === serviceLevel.toLowerCase()
		)
		if (requested) {
			selectedRate = requested
		}
	}

	// Purchase label
	const transaction = await purchaseLabel(selectedRate.object_id)

	return {
		trackingNumber: transaction.tracking_number,
		trackingUrl: transaction.tracking_url_provider,
		labelUrl: transaction.label_url,
		carrier: selectedRate.provider,
		service: selectedRate.servicelevel.name,
		cost: selectedRate.amount,
		currency: selectedRate.currency,
	}
}

// ============================================
// Get Available Carriers
// ============================================

export async function getCarrierAccounts(): Promise<Array<{
	id: string
	carrier: string
	accountId: string
	active: boolean
}>> {
	const result = await shippoRequest<{ results: any[] }>("/carrier_accounts")

	return result.results.map((account) => ({
		id: account.object_id,
		carrier: account.carrier,
		accountId: account.account_id,
		active: account.active,
	}))
}

// ============================================
// Supported Countries (for shipping settings)
// ============================================

export const SUPPORTED_COUNTRIES = [
	{ code: "US", name: "United States" },
	{ code: "CA", name: "Canada" },
	{ code: "GB", name: "United Kingdom" },
	{ code: "AU", name: "Australia" },
	{ code: "DE", name: "Germany" },
	{ code: "FR", name: "France" },
	{ code: "IT", name: "Italy" },
	{ code: "ES", name: "Spain" },
	{ code: "NL", name: "Netherlands" },
	{ code: "BE", name: "Belgium" },
	{ code: "AT", name: "Austria" },
	{ code: "CH", name: "Switzerland" },
	{ code: "SE", name: "Sweden" },
	{ code: "NO", name: "Norway" },
	{ code: "DK", name: "Denmark" },
	{ code: "FI", name: "Finland" },
	{ code: "IE", name: "Ireland" },
	{ code: "PT", name: "Portugal" },
	{ code: "PL", name: "Poland" },
	{ code: "CZ", name: "Czech Republic" },
	{ code: "NZ", name: "New Zealand" },
	{ code: "JP", name: "Japan" },
	{ code: "KR", name: "South Korea" },
	{ code: "SG", name: "Singapore" },
	{ code: "HK", name: "Hong Kong" },
	{ code: "MX", name: "Mexico" },
	{ code: "BR", name: "Brazil" },
	{ code: "AR", name: "Argentina" },
	{ code: "CL", name: "Chile" },
	{ code: "CO", name: "Colombia" },
	{ code: "IN", name: "India" },
	{ code: "PH", name: "Philippines" },
	{ code: "MY", name: "Malaysia" },
	{ code: "TH", name: "Thailand" },
	{ code: "ID", name: "Indonesia" },
	{ code: "VN", name: "Vietnam" },
	{ code: "ZA", name: "South Africa" },
	{ code: "AE", name: "United Arab Emirates" },
	{ code: "SA", name: "Saudi Arabia" },
	{ code: "IL", name: "Israel" },
	{ code: "TR", name: "Turkey" },
	{ code: "RU", name: "Russia" },
	{ code: "UA", name: "Ukraine" },
	{ code: "GR", name: "Greece" },
	{ code: "RO", name: "Romania" },
	{ code: "HU", name: "Hungary" },
	{ code: "SK", name: "Slovakia" },
	{ code: "HR", name: "Croatia" },
	{ code: "SI", name: "Slovenia" },
	{ code: "BG", name: "Bulgaria" },
	{ code: "LT", name: "Lithuania" },
	{ code: "LV", name: "Latvia" },
	{ code: "EE", name: "Estonia" },
] as const

export type CountryCode = typeof SUPPORTED_COUNTRIES[number]["code"]
