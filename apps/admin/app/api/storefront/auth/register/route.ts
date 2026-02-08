import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { users, accounts } from "@quickdash/db/schema"
import { nanoid } from "nanoid"
import { hash } from "bcryptjs"
import { validateStorefrontRequest, storefrontError, handleCorsOptions } from "@/lib/storefront-auth"
import { createCustomerToken } from "@/lib/storefront-jwt"

type RegisterInput = {
	email: string
	password: string
	name: string
	phone?: string
}

export async function POST(request: NextRequest) {
	// Validate storefront API key
	const authResult = await validateStorefrontRequest(request)
	if (!authResult.success) {
		return storefrontError(authResult.error, authResult.status)
	}

	let body: RegisterInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { email, password, name, phone } = body

	// Validate required fields
	if (!email || !password || !name) {
		return storefrontError("Missing required fields: email, password, name", 400)
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	if (!emailRegex.test(email)) {
		return storefrontError("Invalid email format", 400)
	}

	// Validate password strength
	if (password.length < 8) {
		return storefrontError("Password must be at least 8 characters", 400)
	}

	// Check if email already exists
	const [existingUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1)

	if (existingUser) {
		return storefrontError("Email already registered", 409)
	}

	// Hash password
	const hashedPassword = await hash(password, 12)

	// Create user
	const userId = nanoid()
	const [user] = await db
		.insert(users)
		.values({
			id: userId,
			name: name.trim(),
			email: email.toLowerCase().trim(),
			phone: phone?.trim(),
			role: "customer",
			onboardingCompletedAt: new Date(), // Customers don't need onboarding
		})
		.returning()

	// Create credential account
	await db.insert(accounts).values({
		id: nanoid(),
		userId: user.id,
		accountId: user.id,
		providerId: "credential",
		password: hashedPassword,
	})

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
