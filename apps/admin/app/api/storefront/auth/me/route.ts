import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { users, addresses } from "@quickdash/db/schema"
import { validateStorefrontRequest, storefrontError, handleCorsOptions } from "@/lib/storefront-auth"
import { verifyCustomerToken, extractBearerToken } from "@/lib/storefront-jwt"

/**
 * GET /api/storefront/auth/me - Get current customer profile
 */
export async function GET(request: NextRequest) {
	// Validate storefront API key
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	// Get and verify customer token
	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload) {
		return storefrontError("Invalid or expired token", 401)
	}

	// Verify token is for this storefront
	if (payload.storefrontId !== authResult.storefront.id) {
		return storefrontError("Token not valid for this storefront", 403)
	}

	// Get user
	const [user] = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			phone: users.phone,
			image: users.image,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(eq(users.id, payload.sub))
		.limit(1)

	if (!user) {
		return storefrontError("User not found", 404)
	}

	// Get user's addresses
	const userAddresses = await db
		.select({
			id: addresses.id,
			firstName: addresses.firstName,
			lastName: addresses.lastName,
			company: addresses.company,
			addressLine1: addresses.addressLine1,
			addressLine2: addresses.addressLine2,
			city: addresses.city,
			state: addresses.state,
			postalCode: addresses.postalCode,
			country: addresses.country,
			phone: addresses.phone,
			isDefault: addresses.isDefault,
		})
		.from(addresses)
		.where(eq(addresses.userId, user.id))

	return Response.json({
		user: {
			...user,
			addresses: userAddresses,
		},
	})
}

/**
 * PATCH /api/storefront/auth/me - Update customer profile
 */
export async function PATCH(request: NextRequest) {
	// Validate storefront API key
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	// Get and verify customer token
	const token = extractBearerToken(request.headers.get("Authorization"))
	if (!token) {
		return storefrontError("Missing Authorization header", 401)
	}

	const payload = await verifyCustomerToken(token)
	if (!payload) {
		return storefrontError("Invalid or expired token", 401)
	}

	// Verify token is for this storefront
	if (payload.storefrontId !== authResult.storefront.id) {
		return storefrontError("Token not valid for this storefront", 403)
	}

	let body: {
		name?: string
		phone?: string
		image?: string
	}
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	// Build update object
	const updates: Partial<{
		name: string
		phone: string | null
		image: string | null
		updatedAt: Date
	}> = { updatedAt: new Date() }

	if (body.name !== undefined) updates.name = body.name.trim()
	if (body.phone !== undefined) updates.phone = body.phone?.trim() || null
	if (body.image !== undefined) updates.image = body.image || null

	// Update user
	const [user] = await db
		.update(users)
		.set(updates)
		.where(eq(users.id, payload.sub))
		.returning({
			id: users.id,
			email: users.email,
			name: users.name,
			phone: users.phone,
			image: users.image,
		})

	return Response.json({ user })
}

export const OPTIONS = handleCorsOptions
