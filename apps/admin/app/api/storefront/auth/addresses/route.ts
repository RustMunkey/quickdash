import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { addresses } from "@quickdash/db/schema"
import { validateStorefrontRequest, storefrontError, handleCorsOptions } from "@/lib/storefront-auth"
import { verifyCustomerToken, extractBearerToken } from "@/lib/storefront-jwt"

type AddressInput = {
	firstName: string
	lastName: string
	company?: string
	addressLine1: string
	addressLine2?: string
	city: string
	state: string
	postalCode: string
	country: string
	phone?: string
	isDefault?: boolean
}

/**
 * GET /api/storefront/auth/addresses - Get customer's addresses
 */
export async function GET(request: NextRequest) {
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== authResult.storefront.id) {
		return storefrontError("Invalid or expired token", 401)
	}

	const userAddresses = await db
		.select()
		.from(addresses)
		.where(eq(addresses.userId, payload.sub))

	return Response.json({ addresses: userAddresses })
}

/**
 * POST /api/storefront/auth/addresses - Add new address
 */
export async function POST(request: NextRequest) {
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== authResult.storefront.id) {
		return storefrontError("Invalid or expired token", 401)
	}

	let body: AddressInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { firstName, lastName, addressLine1, city, state, postalCode, country } = body
	if (!firstName || !lastName || !addressLine1 || !city || !state || !postalCode || !country) {
		return storefrontError("Missing required address fields", 400)
	}

	// If this is set as default, unset other defaults
	if (body.isDefault) {
		await db
			.update(addresses)
			.set({ isDefault: false })
			.where(eq(addresses.userId, payload.sub))
	}

	const [address] = await db
		.insert(addresses)
		.values({
			userId: payload.sub,
			firstName: body.firstName,
			lastName: body.lastName,
			company: body.company,
			addressLine1: body.addressLine1,
			addressLine2: body.addressLine2,
			city: body.city,
			state: body.state,
			postalCode: body.postalCode,
			country: body.country,
			phone: body.phone,
			isDefault: body.isDefault ?? false,
		})
		.returning()

	return Response.json({ address })
}

/**
 * DELETE /api/storefront/auth/addresses - Delete address (by query param id)
 */
export async function DELETE(request: NextRequest) {
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload || payload.storefrontId !== authResult.storefront.id) {
		return storefrontError("Invalid or expired token", 401)
	}

	const { searchParams } = new URL(request.url)
	const addressId = searchParams.get("id")
	if (!addressId) {
		return storefrontError("Missing address id", 400)
	}

	// Verify address belongs to user
	const [address] = await db
		.select({ id: addresses.id })
		.from(addresses)
		.where(
			and(
				eq(addresses.id, addressId),
				eq(addresses.userId, payload.sub)
			)
		)
		.limit(1)

	if (!address) {
		return storefrontError("Address not found", 404)
	}

	await db.delete(addresses).where(eq(addresses.id, addressId))

	return Response.json({ success: true })
}

export const OPTIONS = handleCorsOptions
