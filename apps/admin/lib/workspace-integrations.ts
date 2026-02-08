import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations, type IntegrationProvider, type ApiKeyCredentials } from "@quickdash/db/schema"

/**
 * Get an active workspace integration by provider
 */
export async function getWorkspaceIntegration(
	workspaceId: string,
	provider: IntegrationProvider
) {
	const [integration] = await db
		.select()
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, provider),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	return integration ?? null
}

/**
 * Get Stripe secret key from workspace integrations
 */
export async function getStripeSecretKey(workspaceId: string): Promise<string | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "stripe")
	if (!integration) return null

	const credentials = integration.credentials as unknown as ApiKeyCredentials | null
	return credentials?.apiKey ?? null
}

/**
 * Get PayPal credentials from workspace integrations
 */
export async function getPayPalCredentials(workspaceId: string): Promise<{
	clientId: string
	clientSecret: string
	mode: "sandbox" | "live"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "paypal")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // clientId
		apiSecret: string // clientSecret
	}
	const metadata = integration.metadata as { testMode?: boolean }

	if (!credentials?.apiKey || !credentials?.apiSecret) return null

	return {
		clientId: credentials.apiKey,
		clientSecret: credentials.apiSecret,
		mode: metadata?.testMode !== false ? "sandbox" : "live",
	}
}

/**
 * Get Polar credentials from workspace integrations
 */
export async function getPolarCredentials(workspaceId: string): Promise<{
	accessToken: string
	webhookSecret: string
	mode: "sandbox" | "production"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "polar")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // accessToken
	}
	const metadata = integration.metadata as { webhookSecret?: string; testMode?: boolean }

	if (!credentials?.apiKey) return null

	return {
		accessToken: credentials.apiKey,
		webhookSecret: metadata?.webhookSecret ?? "",
		mode: metadata?.testMode !== false ? "sandbox" : "production",
	}
}

/**
 * Get Reown (WalletConnect) credentials from workspace integrations
 */
export async function getReownCredentials(workspaceId: string): Promise<{
	projectId: string
	chains: string[]
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "reown")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // projectId
	}
	const metadata = integration.metadata as { chains?: string[] }

	if (!credentials?.apiKey) return null

	return {
		projectId: credentials.apiKey,
		chains: metadata?.chains ?? ["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"],
	}
}

/**
 * Update the lastUsedAt timestamp for an integration
 */
export async function markIntegrationUsed(integrationId: string) {
	await db
		.update(workspaceIntegrations)
		.set({ lastUsedAt: new Date() })
		.where(eq(workspaceIntegrations.id, integrationId))
}
