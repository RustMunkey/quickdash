import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, sql } from "@quickdash/db/drizzle"
import { shippingZones, shippingZoneRates, shippingCarriers, shippingRates, storeSettings } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

type RateInput = {
	country: string
	state?: string
	weight?: number // in kg
	subtotal?: number
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	let body: RateInput
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	const { country, state, weight = 0, subtotal = 0 } = body

	if (!country) {
		return Response.json({ error: "Missing country" }, { status: 400 })
	}

	// Check for free shipping threshold
	const [freeShippingSetting] = await db
		.select({ value: storeSettings.value })
		.from(storeSettings)
		.where(
			and(
				eq(storeSettings.workspaceId, storefront.workspaceId),
				eq(storeSettings.key, "free_shipping_threshold")
			)
		)
		.limit(1)

	const freeShippingThreshold = freeShippingSetting?.value
		? parseFloat(freeShippingSetting.value)
		: null

	if (freeShippingThreshold && subtotal >= freeShippingThreshold) {
		return Response.json({
			rates: [
				{
					id: "free-shipping",
					name: "Free Shipping",
					carrier: "Standard",
					price: 0,
					estimatedDays: "5-7 business days",
					isFree: true,
				},
			],
			freeShippingApplied: true,
		})
	}

	// Find zones that match the country
	const zones = await db
		.select()
		.from(shippingZones)
		.where(
			and(
				eq(shippingZones.workspaceId, storefront.workspaceId),
				eq(shippingZones.isActive, true)
			)
		)

	// Filter zones that include this country
	const matchingZones = zones.filter((zone) => {
		const countries = (zone.countries as string[]) || []
		const regions = (zone.regions as string[]) || []

		// Check country match
		if (countries.includes(country.toUpperCase()) || countries.includes("*")) {
			return true
		}

		// Check region/state match
		if (state && regions.includes(state.toUpperCase())) {
			return true
		}

		return false
	})

	if (matchingZones.length === 0) {
		// No shipping available to this location
		return Response.json({
			rates: [],
			message: "Shipping not available to your location",
		})
	}

	// Get all rates for matching zones
	const zoneIds = matchingZones.map((z) => z.id)

	const rateResults = await db
		.select({
			zoneRateId: shippingZoneRates.id,
			priceOverride: shippingZoneRates.priceOverride,
			carrierName: shippingCarriers.name,
			carrierCode: shippingCarriers.code,
			rateName: shippingRates.name,
			flatRate: shippingRates.flatRate,
			perKgRate: shippingRates.perKgRate,
			minWeight: shippingRates.minWeight,
			maxWeight: shippingRates.maxWeight,
			estimatedDays: shippingRates.estimatedDays,
		})
		.from(shippingZoneRates)
		.innerJoin(shippingCarriers, eq(shippingZoneRates.carrierId, shippingCarriers.id))
		.innerJoin(shippingRates, eq(shippingZoneRates.rateId, shippingRates.id))
		.where(
			and(
				sql`${shippingZoneRates.zoneId} = ANY(${zoneIds})`,
				eq(shippingZoneRates.isActive, true),
				eq(shippingCarriers.isActive, true),
				eq(shippingRates.isActive, true)
			)
		)

	// Filter by weight and calculate prices
	const rates = rateResults
		.filter((rate) => {
			const minWeight = rate.minWeight ? parseFloat(rate.minWeight) : 0
			const maxWeight = rate.maxWeight ? parseFloat(rate.maxWeight) : Infinity
			return weight >= minWeight && weight <= maxWeight
		})
		.map((rate) => {
			let price = 0

			if (rate.priceOverride) {
				price = parseFloat(rate.priceOverride)
			} else if (rate.flatRate) {
				price = parseFloat(rate.flatRate)
				if (rate.perKgRate && weight > 0) {
					price += parseFloat(rate.perKgRate) * weight
				}
			}

			return {
				id: rate.zoneRateId,
				name: rate.rateName,
				carrier: rate.carrierName,
				price: Math.round(price * 100) / 100,
				estimatedDays: rate.estimatedDays,
				isFree: false,
			}
		})
		.sort((a, b) => a.price - b.price)

	return Response.json({
		rates,
		freeShippingThreshold,
		freeShippingApplied: false,
	})
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
