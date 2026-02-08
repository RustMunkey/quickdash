import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { users, accounts } from "@quickdash/db/schema"
import { compare } from "bcryptjs"
import { validateStorefrontRequest, storefrontError, handleCorsOptions } from "@/lib/storefront-auth"
import { createCustomerToken } from "@/lib/storefront-jwt"

type LoginInput = {
	email: string
	password: string
}

export async function POST(request: NextRequest) {
	// Validate storefront API key
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	let body: LoginInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { email, password } = body

	// Validate required fields
	if (!email || !password) {
		return storefrontError("Missing required fields: email, password", 400)
	}

	// Find user by email
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)

	if (!user) {
		return storefrontError("Invalid email or password", 401)
	}

	// Get credential account
	const [account] = await db
		.select()
		.from(accounts)
		.where(
			and(
				eq(accounts.userId, user.id),
				eq(accounts.providerId, "credential")
			)
		)
		.limit(1)

	if (!account?.password) {
		return storefrontError("Invalid email or password", 401)
	}

	// Verify password
	const isValidPassword = await compare(password, account.password)
	if (!isValidPassword) {
		return storefrontError("Invalid email or password", 401)
	}

	// Generate JWT
	const token = await createCustomerToken({
		userId: user.id,
		email: user.email,
		name: user.name,
		workspaceId: authResult.storefront.workspaceId,
		storefrontId: authResult.storefront.id,
	})

	return Response.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			phone: user.phone,
			image: user.image,
		},
		token,
	})
}

export const OPTIONS = handleCorsOptions
