import { Resend } from "resend"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations } from "@quickdash/db/schema"

// Default Resend instance using app-level API key
let defaultResendInstance: Resend | null = null

export function getResend(): Resend | null {
	const apiKey = process.env.RESEND_API_KEY
	if (!apiKey) return null
	if (!defaultResendInstance) {
		defaultResendInstance = new Resend(apiKey)
	}
	return defaultResendInstance
}

// Cache for workspace-specific Resend instances
const workspaceResendCache = new Map<string, { instance: Resend; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get Resend instance for a specific workspace
 * Falls back to default app-level instance if no workspace config exists
 */
export async function getWorkspaceResend(workspaceId: string): Promise<Resend | null> {
	// Check cache first
	const cached = workspaceResendCache.get(workspaceId)
	if (cached && cached.expiresAt > Date.now()) {
		return cached.instance
	}

	// Look up workspace integration
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "resend"),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (integration) {
		const credentials = integration.credentials as { apiKey?: string }
		if (credentials.apiKey) {
			const instance = new Resend(credentials.apiKey)
			workspaceResendCache.set(workspaceId, {
				instance,
				expiresAt: Date.now() + CACHE_TTL,
			})
			return instance
		}
	}

	// No workspace config — do NOT fall back to platform key
	// Each workspace must configure their own Resend integration
	return null
}

/**
 * Get email configuration for a workspace
 * Returns from address, reply-to, etc.
 */
export async function getWorkspaceEmailConfig(workspaceId: string): Promise<{
	fromEmail: string
	fromName?: string
	replyTo?: string
}> {
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, "resend"),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (integration?.metadata) {
		const metadata = integration.metadata as {
			fromEmail?: string
			fromName?: string
			replyTo?: string
		}
		return {
			fromEmail: metadata.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@quickdash.app",
			fromName: metadata.fromName,
			replyTo: metadata.replyTo,
		}
	}

	return {
		fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@quickdash.app",
	}
}

/**
 * Clear cached Resend instance for a workspace
 * Call this when workspace integration is updated/deleted
 */
export function clearWorkspaceResendCache(workspaceId: string): void {
	workspaceResendCache.delete(workspaceId)
}
