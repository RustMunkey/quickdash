import Redis from "ioredis"

const globalForRedis = globalThis as unknown as { redis: Redis | null }

function createRedisClient(): Redis | null {
	// Skip Redis during build — no need to connect while generating static pages
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return null
	}

	const url = process.env.REDIS_URL
	if (!url) {
		if (process.env.NODE_ENV === "production") {
			console.warn("Redis not configured for production, some features disabled")
		}
		return null
	}
	try {
		const client = new Redis(url, {
			maxRetriesPerRequest: 3,
			enableReadyCheck: true,
			retryStrategy: (times) => {
				if (times > 3) return null // Stop retrying after 3 attempts
				return Math.min(times * 100, 3000) // Exponential backoff, max 3 seconds
			},
		})

		client.on("error", (err) => {
			console.error("[Redis] Connection error:", err.message)
		})

		return client
	} catch {
		console.warn("Failed to connect to Redis")
		return null
	}
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
	globalForRedis.redis = redis
}

// ============================================================================
// CACHING HELPERS
// ============================================================================

/**
 * Get a cached value or compute and cache it
 * @param key Cache key
 * @param ttlSeconds Time to live in seconds
 * @param compute Function to compute the value if not cached
 */
export async function cached<T>(
	key: string,
	ttlSeconds: number,
	compute: () => Promise<T>
): Promise<T> {
	if (!redis) {
		// No Redis, just compute
		return compute()
	}

	try {
		const cached = await redis.get(key)
		if (cached) {
			return JSON.parse(cached) as T
		}
	} catch {
		// Cache miss or parse error, continue to compute
	}

	const value = await compute()

	try {
		await redis.setex(key, ttlSeconds, JSON.stringify(value))
	} catch {
		// Ignore cache write errors
	}

	return value
}

/**
 * Invalidate cache by key
 */
export async function invalidateCache(key: string): Promise<void> {
	if (!redis) return
	try {
		await redis.del(key)
	} catch {
		// Ignore errors
	}
}

/**
 * Invalidate multiple cache keys by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
	if (!redis) return
	try {
		const keys = await redis.keys(pattern)
		if (keys.length > 0) {
			await redis.del(...keys)
		}
	} catch {
		// Ignore errors
	}
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitResult {
	success: boolean
	remaining: number
	reset: number // Unix timestamp when limit resets
}

/**
 * Check rate limit using sliding window algorithm
 * @param key Unique identifier (e.g., "api:user:123" or "login:ip:1.2.3.4")
 * @param limit Max requests allowed
 * @param windowSeconds Time window in seconds
 */
export async function checkRateLimit(
	key: string,
	limit: number,
	windowSeconds: number
): Promise<RateLimitResult> {
	if (!redis) {
		// No Redis, allow all requests
		return { success: true, remaining: limit, reset: 0 }
	}

	const now = Date.now()
	const windowMs = windowSeconds * 1000
	const windowStart = now - windowMs

	const fullKey = `ratelimit:${key}`

	try {
		// Remove old entries and count current ones in a transaction
		const multi = redis.multi()
		multi.zremrangebyscore(fullKey, 0, windowStart) // Remove entries older than window
		multi.zadd(fullKey, now.toString(), `${now}:${Math.random()}`) // Add current request
		multi.zcard(fullKey) // Count requests in window
		multi.expire(fullKey, windowSeconds + 1) // Set expiry

		const results = await multi.exec()
		const count = (results?.[2]?.[1] as number) || 0

		const success = count <= limit
		const remaining = Math.max(0, limit - count)
		const reset = Math.ceil((now + windowMs) / 1000)

		return { success, remaining, reset }
	} catch {
		// On error, allow the request
		return { success: true, remaining: limit, reset: 0 }
	}
}

// ============================================================================
// PRESENCE TRACKING (replaces DB-based presence)
// ============================================================================

const PRESENCE_TTL = 60 // 60 seconds

/**
 * Update user presence
 */
export async function updatePresence(
	workspaceId: string,
	userId: string,
	data: { status: string; location?: string }
): Promise<void> {
	if (!redis) return

	const key = `presence:${workspaceId}:${userId}`
	try {
		await redis.setex(
			key,
			PRESENCE_TTL,
			JSON.stringify({
				userId,
				...data,
				lastSeen: Date.now(),
			})
		)
	} catch {
		// Ignore errors
	}
}

/**
 * Get all online users in a workspace
 */
export async function getWorkspacePresence(
	workspaceId: string
): Promise<Array<{ userId: string; status: string; location?: string; lastSeen: number }>> {
	if (!redis) return []

	try {
		const pattern = `presence:${workspaceId}:*`
		const keys = await redis.keys(pattern)
		if (keys.length === 0) return []

		const values = await redis.mget(...keys)
		return values
			.filter((v): v is string => v !== null)
			.map((v) => {
				try {
					return JSON.parse(v)
				} catch {
					return null
				}
			})
			.filter((v): v is NonNullable<typeof v> => v !== null)
	} catch {
		return []
	}
}

/**
 * Remove user presence (on logout/disconnect)
 */
export async function removePresence(
	workspaceId: string,
	userId: string
): Promise<void> {
	if (!redis) return
	try {
		await redis.del(`presence:${workspaceId}:${userId}`)
	} catch {
		// Ignore errors
	}
}

// ============================================================================
// WORKSPACE SETTINGS CACHE
// ============================================================================

const SETTINGS_CACHE_TTL = 300 // 5 minutes

/**
 * Cache workspace settings
 */
export async function cacheWorkspaceSettings(
	workspaceId: string,
	settings: Record<string, unknown>
): Promise<void> {
	if (!redis) return
	try {
		await redis.setex(
			`workspace:settings:${workspaceId}`,
			SETTINGS_CACHE_TTL,
			JSON.stringify(settings)
		)
	} catch {
		// Ignore errors
	}
}

/**
 * Get cached workspace settings
 */
export async function getCachedWorkspaceSettings(
	workspaceId: string
): Promise<Record<string, unknown> | null> {
	if (!redis) return null
	try {
		const cached = await redis.get(`workspace:settings:${workspaceId}`)
		return cached ? JSON.parse(cached) : null
	} catch {
		return null
	}
}

// ============================================================================
// DEDUPLICATION (for idempotent operations)
// ============================================================================

/**
 * Check if an operation was recently performed (for deduplication)
 * @param key Unique operation key
 * @param ttlSeconds How long to remember the operation
 * @returns true if this is a duplicate (operation was done recently)
 */
export async function isDuplicate(key: string, ttlSeconds: number): Promise<boolean> {
	if (!redis) return false

	const fullKey = `dedup:${key}`
	try {
		// SETNX returns 1 if key didn't exist (not duplicate), 0 if it did (duplicate)
		const result = await redis.setnx(fullKey, "1")
		if (result === 1) {
			// First time seeing this key, set expiry
			await redis.expire(fullKey, ttlSeconds)
			return false // Not a duplicate
		}
		return true // Duplicate
	} catch {
		return false // On error, allow the operation
	}
}
