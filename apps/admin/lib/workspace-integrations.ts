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
 * Get Stripe secret key from workspace integrations (respects testMode toggle)
 */
export async function getStripeSecretKey(workspaceId: string): Promise<string | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "stripe")
	if (!integration) return null

	const credentials = integration.credentials as unknown as ApiKeyCredentials | null
	const metadata = integration.metadata as {
		testSecretKey?: string
		testMode?: boolean
	} | null

	if (metadata?.testMode && metadata?.testSecretKey) {
		return metadata.testSecretKey
	}
	return credentials?.apiKey ?? null
}

/**
 * Get Stripe publishable key (respects testMode toggle)
 */
export async function getStripePublishableKey(workspaceId: string): Promise<string | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "stripe")
	if (!integration) return null

	const metadata = integration.metadata as {
		publishableKey?: string
		testPublishableKey?: string
		testMode?: boolean
	} | null

	if (metadata?.testMode && metadata?.testPublishableKey) {
		return metadata.testPublishableKey
	}
	return metadata?.publishableKey ?? null
}

/**
 * Get Stripe webhook secret (respects testMode toggle)
 */
export async function getStripeWebhookSecret(workspaceId: string): Promise<string | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "stripe")
	if (!integration) return null

	const metadata = integration.metadata as {
		webhookSecret?: string
		testWebhookSecret?: string
		testMode?: boolean
	} | null

	if (metadata?.testMode && metadata?.testWebhookSecret) {
		return metadata.testWebhookSecret
	}
	return metadata?.webhookSecret ?? null
}

/**
 * Get PayPal credentials from workspace integrations (respects testMode toggle)
 */
export async function getPayPalCredentials(workspaceId: string): Promise<{
	clientId: string
	clientSecret: string
	mode: "sandbox" | "live"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "paypal")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // live clientId
		apiSecret: string // live clientSecret
	}
	const metadata = integration.metadata as {
		testClientId?: string
		testClientSecret?: string
		testMode?: boolean
	}

	const isTestMode = metadata?.testMode !== false

	if (isTestMode && metadata?.testClientId && metadata?.testClientSecret) {
		return {
			clientId: metadata.testClientId,
			clientSecret: metadata.testClientSecret,
			mode: "sandbox",
		}
	}

	if (!credentials?.apiKey || !credentials?.apiSecret) return null

	return {
		clientId: credentials.apiKey,
		clientSecret: credentials.apiSecret,
		mode: isTestMode ? "sandbox" : "live",
	}
}

/**
 * Get Polar credentials from workspace integrations (respects testMode toggle)
 */
export async function getPolarCredentials(workspaceId: string): Promise<{
	accessToken: string
	webhookSecret: string
	mode: "sandbox" | "production"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "polar")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // live accessToken
	}
	const metadata = integration.metadata as {
		webhookSecret?: string
		testAccessToken?: string
		testWebhookSecret?: string
		testMode?: boolean
	}

	const isTestMode = metadata?.testMode !== false

	if (isTestMode && metadata?.testAccessToken) {
		return {
			accessToken: metadata.testAccessToken,
			webhookSecret: metadata?.testWebhookSecret ?? "",
			mode: "sandbox",
		}
	}

	if (!credentials?.apiKey) return null

	return {
		accessToken: credentials.apiKey,
		webhookSecret: metadata?.webhookSecret ?? "",
		mode: isTestMode ? "sandbox" : "production",
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
 * Get Shopify credentials from workspace integrations
 */
export async function getShopifyCredentials(workspaceId: string): Promise<{
	storeDomain: string
	storefrontToken: string
	adminToken: string
	mode: "sandbox" | "live"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "shopify")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // storefrontToken
		apiSecret: string // adminToken
	}
	const metadata = integration.metadata as { storeDomain?: string; testMode?: boolean }

	if (!credentials?.apiKey || !metadata?.storeDomain) return null

	return {
		storeDomain: metadata.storeDomain,
		storefrontToken: credentials.apiKey,
		adminToken: credentials.apiSecret || "",
		mode: metadata?.testMode !== false ? "sandbox" : "live",
	}
}

/**
 * Get Square credentials from workspace integrations (respects testMode toggle)
 */
export async function getSquareCredentials(workspaceId: string): Promise<{
	applicationId: string
	accessToken: string
	locationId: string
	mode: "sandbox" | "live"
} | null> {
	const integration = await getWorkspaceIntegration(workspaceId, "square")
	if (!integration) return null

	const credentials = integration.credentials as {
		apiKey: string // live accessToken
	}
	const metadata = integration.metadata as {
		applicationId?: string
		locationId?: string
		testApplicationId?: string
		testAccessToken?: string
		testLocationId?: string
		testMode?: boolean
	}

	const isTestMode = metadata?.testMode !== false

	if (isTestMode && metadata?.testAccessToken && metadata?.testApplicationId) {
		return {
			applicationId: metadata.testApplicationId,
			accessToken: metadata.testAccessToken,
			locationId: metadata?.testLocationId || "",
			mode: "sandbox",
		}
	}

	if (!credentials?.apiKey || !metadata?.applicationId) return null

	return {
		applicationId: metadata.applicationId,
		accessToken: credentials.apiKey,
		locationId: metadata?.locationId || "",
		mode: isTestMode ? "sandbox" : "live",
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
