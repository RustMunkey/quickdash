/**
 * Admin API Authentication & Utilities
 *
 * Handles API key generation, verification, and rate limiting for the Admin API.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { adminApiKeys, workspaces, type ApiKeyPermissions, type WorkspaceFeatures } from "@quickdash/db/schema"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

// Key format: jb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars after prefix)
const KEY_PREFIX_LIVE = "jb_live_"
const KEY_PREFIX_TEST = "jb_test_"
const KEY_RANDOM_LENGTH = 40

// Simple in-memory rate limiter (resets on cold start but protects during hot instances)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const DEFAULT_RATE_LIMIT = 1000 // requests per hour

function checkRateLimit(keyId: string, limit: number = DEFAULT_RATE_LIMIT): boolean {
	const now = Date.now()
	const entry = rateLimitMap.get(keyId)

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(keyId, { count: 1, resetAt: now + 3600_000 }) // 1 hour window
		return true
	}

	entry.count++
	if (entry.count > limit) {
		return false
	}
	return true
}

/**
 * Generate a new Admin API key
 * Returns the full key (only shown once) and the hash for storage
 */
export function generateApiKey(environment: "live" | "test" = "live"): {
	fullKey: string
	keyPrefix: string
	keyHash: string
} {
	const prefix = environment === "live" ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST
	const randomPart = randomBytes(KEY_RANDOM_LENGTH / 2).toString("hex") // 40 hex chars
	const fullKey = `${prefix}${randomPart}`
	const keyPrefix = fullKey.slice(0, 12) // "sk_live_xxxx" or "sk_test_xxxx"
	const keyHash = hashApiKey(fullKey)

	return { fullKey, keyPrefix, keyHash }
}

/**
 * Hash an API key for secure storage
 */
export function hashApiKey(key: string): string {
	return createHash("sha256").update(key).digest("hex")
}

/**
 * Verify an API key and return the associated workspace
 */
export async function verifyApiKey(apiKey: string): Promise<{
	valid: boolean
	workspace?: {
		id: string
		name: string
		slug: string
	}
	permissions?: ApiKeyPermissions
	error?: string
	keyId?: string
}> {
	// Basic format validation
	if (!apiKey || (!apiKey.startsWith("jb_live_") && !apiKey.startsWith("jb_test_"))) {
		return { valid: false, error: "Invalid API key format" }
	}

	const keyHash = hashApiKey(apiKey)

	// Look up the key
	const [keyRecord] = await db
		.select({
			id: adminApiKeys.id,
			workspaceId: adminApiKeys.workspaceId,
			permissions: adminApiKeys.permissions,
			isActive: adminApiKeys.isActive,
			expiresAt: adminApiKeys.expiresAt,
			allowedIps: adminApiKeys.allowedIps,
			workspaceName: workspaces.name,
			workspaceSlug: workspaces.slug,
			workspaceOwnerId: workspaces.ownerId,
			workspaceFeatures: workspaces.features,
		})
		.from(adminApiKeys)
		.innerJoin(workspaces, eq(adminApiKeys.workspaceId, workspaces.id))
		.where(eq(adminApiKeys.keyHash, keyHash))
		.limit(1)

	if (!keyRecord) {
		return { valid: false, error: "Invalid API key" }
	}

	// Check if key is active
	if (!keyRecord.isActive) {
		return { valid: false, error: "API key is disabled" }
	}

	// Check expiration
	if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
		return { valid: false, error: "API key has expired" }
	}

	// Check if workspace has API access feature enabled
	const wsFeatures = keyRecord.workspaceFeatures as WorkspaceFeatures | null
	if (wsFeatures && !wsFeatures.adminApi) {
		return { valid: false, error: "API access is not available on your current plan. Upgrade to unlock API access." }
	}

	// Update last used timestamp (fire and forget)
	db.update(adminApiKeys)
		.set({
			lastUsedAt: new Date(),
			usageCount: String(Number(keyRecord.id) + 1), // Increment usage
		})
		.where(eq(adminApiKeys.id, keyRecord.id))
		.catch(() => {}) // Ignore errors

	// Record API call usage (fire and forget)
	import("@/lib/metering").then(({ recordUsage }) => {
		recordUsage({
			userId: keyRecord.workspaceOwnerId,
			workspaceId: keyRecord.workspaceId,
			metric: "api_calls",
			metadata: { keyId: keyRecord.id },
		}).catch(() => {})
	}).catch(() => {})

	return {
		valid: true,
		workspace: {
			id: keyRecord.workspaceId,
			name: keyRecord.workspaceName,
			slug: keyRecord.workspaceSlug,
		},
		permissions: keyRecord.permissions,
		keyId: keyRecord.id,
	}
}

/**
 * Check if the API key has a specific permission
 */
export function hasPermission(
	permissions: ApiKeyPermissions,
	permission: keyof Omit<ApiKeyPermissions, "fullAccess">
): boolean {
	if (permissions.fullAccess) return true
	return permissions[permission] === true
}

/**
 * Extract API key from request headers
 */
export async function getApiKeyFromRequest(): Promise<string | null> {
	const headersList = await headers()

	// Check Authorization header (Bearer token)
	const authHeader = headersList.get("authorization")
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7)
	}

	// Check X-API-Key header
	const apiKeyHeader = headersList.get("x-api-key")
	if (apiKeyHeader) {
		return apiKeyHeader
	}

	return null
}

/**
 * Middleware helper to authenticate Admin API requests
 * Use in API route handlers
 */
export async function authenticateAdminApi(
	requiredPermission?: keyof Omit<ApiKeyPermissions, "fullAccess">
): Promise<
	| { success: true; workspace: { id: string; name: string; slug: string }; permissions: ApiKeyPermissions; keyId: string }
	| { success: false; response: NextResponse }
> {
	const apiKey = await getApiKeyFromRequest()

	if (!apiKey) {
		return {
			success: false,
			response: NextResponse.json(
				{
					error: "Authentication required",
					message: "Provide an API key via Authorization header (Bearer token) or X-API-Key header",
					code: "UNAUTHORIZED",
				},
				{ status: 401 }
			),
		}
	}

	const result = await verifyApiKey(apiKey)

	if (!result.valid) {
		return {
			success: false,
			response: NextResponse.json(
				{
					error: "Invalid API key",
					message: result.error,
					code: "INVALID_API_KEY",
				},
				{ status: 401 }
			),
		}
	}

	// Rate limiting
	if (result.keyId && !checkRateLimit(result.keyId)) {
		return {
			success: false,
			response: NextResponse.json(
				{
					error: "Rate limit exceeded",
					message: "Too many requests. Please try again later.",
					code: "RATE_LIMITED",
				},
				{ status: 429, headers: { "Retry-After": "60" } }
			),
		}
	}

	// Check specific permission if required
	if (requiredPermission && !hasPermission(result.permissions!, requiredPermission)) {
		return {
			success: false,
			response: NextResponse.json(
				{
					error: "Insufficient permissions",
					message: `This API key does not have the '${requiredPermission}' permission`,
					code: "FORBIDDEN",
				},
				{ status: 403 }
			),
		}
	}

	return {
		success: true,
		workspace: result.workspace!,
		permissions: result.permissions!,
		keyId: result.keyId!,
	}
}

/**
 * Standard API error response
 */
export function apiError(
	message: string,
	code: string,
	status: number,
	details?: Record<string, unknown>
): NextResponse {
	return NextResponse.json(
		{
			error: message,
			code,
			...(details && { details }),
		},
		{ status }
	)
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
	return NextResponse.json(data, { status })
}

/**
 * Pagination helper
 */
export function getPaginationParams(searchParams: URLSearchParams): {
	page: number
	limit: number
	offset: number
} {
	const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
	const offset = (page - 1) * limit

	return { page, limit, offset }
}

/**
 * Build pagination response metadata
 */
export function buildPaginationMeta(
	total: number,
	page: number,
	limit: number
): {
	total: number
	page: number
	limit: number
	totalPages: number
	hasMore: boolean
} {
	const totalPages = Math.ceil(total / limit)
	return {
		total,
		page,
		limit,
		totalPages,
		hasMore: page < totalPages,
	}
}
