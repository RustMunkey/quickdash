/**
 * 17track Tracking Service Integration
 *
 * Registers tracking numbers with 17track to receive webhook updates.
 * Free tier: 100 trackings/month, 3100+ carriers supported
 *
 * Docs: https://api.17track.net/doc
 */

import { env } from "@/env"

const TRACK17_API_URL = "https://api.17track.net/track/v2.2"

interface Track17Response<T> {
	code: number
	data: T
}

interface Track17RegisterResult {
	accepted: Array<{
		number: string
		carrier: number
	}>
	rejected: Array<{
		number: string
		error: {
			code: number
			message: string
		}
	}>
}

interface Track17TrackInfo {
	number: string
	carrier: number
	param?: string
	tag?: string
	track_info: {
		shipping_info: {
			shipper_address: {
				country: string
				state: string
				city: string
			}
			recipient_address: {
				country: string
				state: string
				city: string
			}
		}
		latest_status: {
			status: string
			sub_status: string
		}
		latest_event: {
			time_iso: string
			time_utc: string
			description: string
			location: string
		}
		time_metrics: {
			days_after_order: number
			days_of_transit: number
			days_of_transit_done: number
			days_after_last_update: number
			estimated_delivery_date: {
				source: string
				from: string
				to: string
			}
		}
		milestone: Array<{
			key_stage: string
			time_iso: string
			time_utc: string
		}>
	}
	track: Array<{
		time_iso: string
		time_utc: string
		description: string
		location: string
		stage: string
		sub_status: string
	}>
}

// 17track carrier codes for common carriers
// Full list: https://api.17track.net/doc/carriers
const CARRIER_MAP: Record<string, number> = {
	usps: 21051,
	ups: 100002,
	fedex: 100003,
	dhl: 100001,
	dhl_express: 100001,
	ontrac: 100049,
	lasership: 100062,
	amazon: 100143,
	// Auto-detect
	auto: 0,
}

/**
 * Check if 17track is configured
 */
export function isTrackingServiceConfigured(): boolean {
	return !!env.TRACK17_API_KEY
}

// Keep old function name for backwards compatibility
export const isTracktryConfigured = isTrackingServiceConfigured

/**
 * Make authenticated request to 17track API
 */
async function track17Request<T>(
	endpoint: string,
	body: unknown
): Promise<Track17Response<T>> {
	if (!env.TRACK17_API_KEY) {
		throw new Error("TRACK17_API_KEY not configured")
	}

	const response = await fetch(`${TRACK17_API_URL}${endpoint}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"17token": env.TRACK17_API_KEY,
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const error = await response.text()
		throw new Error(`17track API error: ${response.status} - ${error}`)
	}

	return response.json()
}

/**
 * Register a tracking number with 17track
 *
 * Once registered, 17track will monitor the shipment and send
 * webhook updates to our /api/webhooks/shipping/17track endpoint.
 */
export async function registerTracking(
	trackingNumber: string,
	carrierCode: string,
	orderId?: string
): Promise<{ success: boolean; trackingId?: string; error?: string }> {
	if (!isTrackingServiceConfigured()) {
		return { success: false, error: "17track not configured" }
	}

	// Get 17track carrier code, default to auto-detect (0)
	const carrier = CARRIER_MAP[carrierCode.toLowerCase()] ?? 0

	try {
		const response = await track17Request<Track17RegisterResult>("/register", [
			{
				number: trackingNumber,
				carrier: carrier,
				tag: orderId, // Store order ID as tag for webhook matching
			},
		])

		if (response.code === 0 && response.data.accepted.length > 0) {
			return {
				success: true,
				trackingId: trackingNumber,
			}
		}

		if (response.data.rejected.length > 0) {
			const rejection = response.data.rejected[0]
			// Code 0 = already registered, which is fine
			if (rejection.error.code === 0) {
				return { success: true, trackingId: trackingNumber }
			}
			return {
				success: false,
				error: rejection.error.message,
			}
		}

		return {
			success: false,
			error: `17track error code: ${response.code}`,
		}
	} catch (error) {
		console.error("[17track] Failed to register tracking:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		}
	}
}

/**
 * Get tracking status from 17track
 */
export async function getTrackingStatus(
	trackingNumber: string,
	carrierCode: string
): Promise<{
	status: string
	statusDetail?: string
	estimatedDelivery?: string
	events: Array<{ timestamp: string; status: string; location?: string }>
} | null> {
	if (!isTrackingServiceConfigured()) {
		return null
	}

	const carrier = CARRIER_MAP[carrierCode.toLowerCase()] ?? 0

	try {
		const response = await track17Request<{
			accepted: Track17TrackInfo[]
			rejected: Array<{ number: string; error: { code: number; message: string } }>
		}>("/gettrackinfo", [
			{
				number: trackingNumber,
				carrier: carrier,
			},
		])

		if (response.code !== 0 || response.data.accepted.length === 0) {
			return null
		}

		const info = response.data.accepted[0]
		const trackInfo = info.track_info

		return {
			status: trackInfo.latest_status.status,
			statusDetail: trackInfo.latest_status.sub_status,
			estimatedDelivery: trackInfo.time_metrics.estimated_delivery_date?.to,
			events: info.track.map((event) => ({
				timestamp: event.time_iso,
				status: event.description,
				location: event.location || undefined,
			})),
		}
	} catch (error) {
		console.error("[17track] Failed to get tracking status:", error)
		return null
	}
}

/**
 * Stop tracking a shipment
 */
export async function stopTracking(
	trackingNumber: string,
	carrierCode: string
): Promise<boolean> {
	if (!isTrackingServiceConfigured()) {
		return false
	}

	const carrier = CARRIER_MAP[carrierCode.toLowerCase()] ?? 0

	try {
		const response = await track17Request<{
			accepted: Array<{ number: string }>
			rejected: Array<{ number: string }>
		}>("/stoptrack", [
			{
				number: trackingNumber,
				carrier: carrier,
			},
		])

		return response.code === 0 && response.data.accepted.length > 0
	} catch (error) {
		console.error("[17track] Failed to stop tracking:", error)
		return false
	}
}

/**
 * Retrack a previously stopped shipment
 */
export async function retrack(
	trackingNumber: string,
	carrierCode: string
): Promise<boolean> {
	if (!isTrackingServiceConfigured()) {
		return false
	}

	const carrier = CARRIER_MAP[carrierCode.toLowerCase()] ?? 0

	try {
		const response = await track17Request<{
			accepted: Array<{ number: string }>
			rejected: Array<{ number: string }>
		}>("/retrack", [
			{
				number: trackingNumber,
				carrier: carrier,
			},
		])

		return response.code === 0 && response.data.accepted.length > 0
	} catch (error) {
		console.error("[17track] Failed to retrack:", error)
		return false
	}
}

/**
 * Delete tracking from 17track (alias for stopTracking)
 */
export const deleteTracking = stopTracking

/**
 * Map 17track status to our normalized status
 */
export function normalizeTrack17Status(status: string, subStatus: string): string {
	// 17track statuses: NotFound, InfoReceived, InTransit, Expired,
	// AvailableForPickup, OutForDelivery, DeliveryFailure, Delivered, Exception

	const statusLower = status.toLowerCase()

	switch (statusLower) {
		case "delivered":
			return "delivered"
		case "outfordelivery":
		case "out_for_delivery":
			return "out_for_delivery"
		case "availableforpickup":
		case "available_for_pickup":
			return "available_for_pickup"
		case "intransit":
		case "in_transit":
			return "in_transit"
		case "inforeceived":
		case "info_received":
			return "label_created"
		case "deliveryfailure":
		case "delivery_failure":
		case "exception":
			return "exception"
		case "expired":
			return "expired"
		case "notfound":
		case "not_found":
			return "pending"
		default:
			return "in_transit"
	}
}
