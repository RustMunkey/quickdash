import { db } from "@quickdash/db/client"
import { and, eq, gte, inArray, isNull, lte, or } from "@quickdash/db/drizzle"
import {
	discounts,
	inventory,
	productVariants,
	products,
	referralCodes,
	shippingCarriers,
	shippingRates,
	shippingZoneRates,
	shippingZones,
	storeSettings,
	users,
} from "@quickdash/db/schema"

export type CheckoutQuoteInput = {
	items: Array<{ variantId: string; quantity: number }>
	country: string
	state?: string
	discountCode?: string
	customerEmail?: string
}

export type CheckoutQuote = {
	currency: string
	items: Array<{ variantId: string; productId: string; name: string; quantity: number; unitAmount: number }>
	subtotal: number
	shippingAmount: number
	discountAmount: number
	total: number
}

function money(value: number) {
	return Math.round(value * 100) / 100
}

export async function createCheckoutQuote(
	workspaceId: string,
	input: CheckoutQuoteInput
): Promise<CheckoutQuote> {
	if (!input.items.length) throw new Error("Your cart is empty")

	const quantities = new Map<string, number>()
	for (const item of input.items) {
		if (!item.variantId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
			throw new Error("Every cart item requires a valid variant and quantity")
		}
		quantities.set(item.variantId, (quantities.get(item.variantId) || 0) + item.quantity)
	}

	const variantIds = [...quantities.keys()]
	const rows = await db
		.select({
			variantId: productVariants.id,
			variantName: productVariants.name,
			variantPrice: productVariants.price,
			productId: products.id,
			productName: products.name,
			productPrice: products.price,
			quantity: inventory.quantity,
			reservedQuantity: inventory.reservedQuantity,
		})
		.from(productVariants)
		.innerJoin(products, eq(products.id, productVariants.productId))
		.leftJoin(inventory, and(
			eq(inventory.variantId, productVariants.id),
			eq(inventory.workspaceId, workspaceId)
		))
		.where(and(
			inArray(productVariants.id, variantIds),
			eq(productVariants.isActive, true),
			eq(products.isActive, true),
			eq(products.workspaceId, workspaceId)
		))

	if (rows.length !== variantIds.length) throw new Error("One or more products are unavailable")

	const quotedItems = rows.map((row) => {
		const requestedQuantity = quantities.get(row.variantId) || 0
		const available = Math.max(0, (row.quantity || 0) - (row.reservedQuantity || 0))
		if (requestedQuantity > available) {
			throw new Error(`${row.productName} no longer has enough stock`)
		}
		const unitAmount = Number(row.variantPrice || row.productPrice)
		if (!Number.isFinite(unitAmount) || unitAmount < 0) throw new Error("A product has an invalid price")
		return {
			variantId: row.variantId,
			productId: row.productId,
			name: row.variantName ? `${row.productName} — ${row.variantName}` : row.productName,
			quantity: requestedQuantity,
			unitAmount: money(unitAmount),
		}
	})

	const subtotal = money(quotedItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0))
	let discountAmount = 0
	const normalizedCode = input.discountCode?.trim().toUpperCase()

	if (normalizedCode) {
		const now = new Date()
		const [discount] = await db
			.select()
			.from(discounts)
			.where(and(
				eq(discounts.workspaceId, workspaceId),
				eq(discounts.code, normalizedCode),
				eq(discounts.isActive, true),
				or(isNull(discounts.startsAt), lte(discounts.startsAt, now)),
				or(isNull(discounts.expiresAt), gte(discounts.expiresAt, now))
			))
			.limit(1)

		if (discount) {
			if (discount.maxUses && (discount.currentUses || 0) >= discount.maxUses) {
				throw new Error("Discount code has reached its usage limit")
			}
			if (discount.minimumOrderAmount && subtotal < Number(discount.minimumOrderAmount)) {
				throw new Error("The order no longer meets this discount's minimum")
			}
			discountAmount = discount.valueType === "percentage"
				? subtotal * Number(discount.value) / 100
				: Number(discount.value)
		} else {
			const [referral] = await db
				.select({ userId: referralCodes.userId })
				.from(referralCodes)
				.where(and(
					eq(referralCodes.workspaceId, workspaceId),
					eq(referralCodes.code, normalizedCode)
				))
				.limit(1)
			if (!referral) throw new Error("Discount code is invalid or expired")
			if (input.customerEmail) {
				const [referrer] = await db.select({ email: users.email }).from(users).where(eq(users.id, referral.userId)).limit(1)
				if (referrer?.email.toLowerCase() === input.customerEmail.toLowerCase()) {
					throw new Error("You cannot use your own referral code")
				}
			}
			discountAmount = subtotal * 0.1
		}
	}

	discountAmount = money(Math.min(subtotal, Math.max(0, discountAmount)))
	const [currencySetting, freeShippingSetting] = await Promise.all([
		db.select({ value: storeSettings.value }).from(storeSettings).where(and(eq(storeSettings.workspaceId, workspaceId), eq(storeSettings.key, "currency"))).limit(1),
		db.select({ value: storeSettings.value }).from(storeSettings).where(and(eq(storeSettings.workspaceId, workspaceId), eq(storeSettings.key, "free_shipping_threshold"))).limit(1),
	])
	const currency = currencySetting[0]?.value?.toUpperCase() || "CAD"
	const freeShippingThreshold = Number(freeShippingSetting[0]?.value || 0)
	let shippingAmount = 0

	if (!(freeShippingThreshold > 0 && subtotal >= freeShippingThreshold)) {
		const zones = await db.select().from(shippingZones).where(and(
			eq(shippingZones.workspaceId, workspaceId),
			eq(shippingZones.isActive, true)
		))
		const country = input.country.toUpperCase()
		const state = input.state?.toUpperCase()
		const zoneIds = zones.filter((zone) => {
			const countries = zone.countries || []
			const regions = zone.regions || []
			return countries.includes(country) || countries.includes("*") || Boolean(state && regions.includes(state))
		}).map((zone) => zone.id)
		if (!zoneIds.length) throw new Error("Shipping is not available to this address")

		const rates = await db
			.select({ override: shippingZoneRates.priceOverride, flat: shippingRates.flatRate })
			.from(shippingZoneRates)
			.innerJoin(shippingCarriers, eq(shippingCarriers.id, shippingZoneRates.carrierId))
			.innerJoin(shippingRates, eq(shippingRates.id, shippingZoneRates.rateId))
			.where(and(
				inArray(shippingZoneRates.zoneId, zoneIds),
				eq(shippingZoneRates.isActive, true),
				eq(shippingCarriers.isActive, true),
				eq(shippingRates.isActive, true)
			))
		const prices = rates.map((rate) => Number(rate.override ?? rate.flat ?? 0)).filter((price) => Number.isFinite(price) && price >= 0)
		if (!prices.length) throw new Error("Shipping is not available to this address")
		shippingAmount = money(Math.min(...prices))
	}

	return {
		currency,
		items: quotedItems,
		subtotal,
		shippingAmount,
		discountAmount,
		total: money(subtotal + shippingAmount - discountAmount),
	}
}
