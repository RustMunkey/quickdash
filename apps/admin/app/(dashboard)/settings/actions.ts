"use server"

import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, and } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireSettingsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage settings")
	}
	return workspace
}

export async function getSettings(group?: string) {
	const workspace = await requireWorkspace()
	if (group) {
		return db
			.select()
			.from(schema.storeSettings)
			.where(and(eq(schema.storeSettings.workspaceId, workspace.id), eq(schema.storeSettings.group, group)))
			.orderBy(schema.storeSettings.key)
	}
	return db
		.select()
		.from(schema.storeSettings)
		.where(eq(schema.storeSettings.workspaceId, workspace.id))
		.orderBy(schema.storeSettings.group, schema.storeSettings.key)
}

export async function getSetting(key: string) {
	const workspace = await requireWorkspace()
	const [setting] = await db
		.select()
		.from(schema.storeSettings)
		.where(and(eq(schema.storeSettings.key, key), eq(schema.storeSettings.workspaceId, workspace.id)))
	return setting?.value ?? null
}

export async function updateSetting(key: string, value: string, group: string = "general") {
	const workspace = await requireSettingsPermission()
	const [existing] = await db
		.select()
		.from(schema.storeSettings)
		.where(and(eq(schema.storeSettings.key, key), eq(schema.storeSettings.workspaceId, workspace.id)))

	if (existing) {
		await db
			.update(schema.storeSettings)
			.set({ value, updatedAt: new Date() })
			.where(and(eq(schema.storeSettings.key, key), eq(schema.storeSettings.workspaceId, workspace.id)))
	} else {
		await db
			.insert(schema.storeSettings)
			.values({ workspaceId: workspace.id, key, value, group })
	}
}

export async function updateSettings(entries: { key: string; value: string; group: string }[]) {
	const workspace = await requireSettingsPermission()

	for (const entry of entries) {
		await updateSetting(entry.key, entry.value, entry.group)
	}

	// Sync logo to workspaces table for sidebar display
	const logoEntry = entries.find(e => e.key === "store_logo_url")
	if (logoEntry !== undefined) {
		await db
			.update(schema.workspaces)
			.set({ logo: logoEntry.value || null, updatedAt: new Date() })
			.where(eq(schema.workspaces.id, workspace.id))
	}

	// Revalidate to update sidebar with new logo/branding
	const { revalidatePath } = await import("next/cache")
	revalidatePath("/", "layout")
}

// ============================================
// Workspace Integrations (BYOK)
// ============================================

export async function getWorkspaceEmailConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "resend")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasCustomConfig: false,
			apiKey: "",
			webhookSecret: "",
			fromEmail: "",
			fromName: "",
			replyTo: "",
			webhookUrl: "",
		}
	}

	const credentials = integration.credentials as { apiKey?: string; webhookSecret?: string } | null
	const metadata = integration.metadata as {
		fromEmail?: string
		fromName?: string
		replyTo?: string
	} | null

	return {
		hasCustomConfig: true,
		apiKey: credentials?.apiKey || "",
		webhookSecret: credentials?.webhookSecret || "",
		fromEmail: metadata?.fromEmail || "",
		fromName: metadata?.fromName || "",
		replyTo: metadata?.replyTo || "",
		webhookUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL || ""}/api/webhooks/resend/${workspace.id}`,
	}
}

export async function saveWorkspaceEmailConfig(config: {
	apiKey: string
	webhookSecret: string
	fromEmail: string
	fromName: string
	replyTo: string
}) {
	const workspace = await requireSettingsPermission()

	// Check if integration already exists
	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "resend")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.apiKey, webhookSecret: config.webhookSecret }
	const metadata = {
		fromEmail: config.fromEmail,
		fromName: config.fromName,
		replyTo: config.replyTo,
	}

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "resend",
			name: "Email (Resend)",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}

	// Clear the cache so new config is used immediately
	const { clearWorkspaceResendCache } = await import("@/lib/resend")
	clearWorkspaceResendCache(workspace.id)
}

export async function deleteWorkspaceEmailConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "resend")
			)
		)

	// Clear the cache
	const { clearWorkspaceResendCache } = await import("@/lib/resend")
	clearWorkspaceResendCache(workspace.id)
}

// ============================================
// Stripe Integration (BYOK)
// ============================================

export async function getWorkspaceStripeConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "stripe")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			secretKey: "",
			publishableKey: "",
			webhookSecret: "",
			testMode: true,
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
		apiSecret?: string
	} | null
	const metadata = integration.metadata as {
		publishableKey?: string
		webhookSecret?: string
		testMode?: boolean
	} | null

	return {
		hasConfig: true,
		secretKey: credentials?.apiKey || "",
		publishableKey: metadata?.publishableKey || "",
		webhookSecret: metadata?.webhookSecret || "",
		testMode: metadata?.testMode ?? true,
	}
}

export async function saveWorkspaceStripeConfig(config: {
	secretKey: string
	publishableKey: string
	webhookSecret: string
	testMode: boolean
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "stripe")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.secretKey }
	const metadata = {
		publishableKey: config.publishableKey,
		webhookSecret: config.webhookSecret,
		testMode: config.testMode,
	}

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "stripe",
			name: "Stripe Payments",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspaceStripeConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "stripe")
			)
		)
}

// ============================================
// PayPal Integration (BYOK)
// ============================================

export async function getWorkspacePayPalConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "paypal")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			clientId: "",
			clientSecret: "",
			testMode: true,
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
		apiSecret?: string
	} | null
	const metadata = integration.metadata as {
		testMode?: boolean
	} | null

	return {
		hasConfig: true,
		clientId: credentials?.apiKey || "",
		clientSecret: credentials?.apiSecret || "",
		testMode: metadata?.testMode ?? true,
	}
}

export async function saveWorkspacePayPalConfig(config: {
	clientId: string
	clientSecret: string
	testMode: boolean
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "paypal")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.clientId, apiSecret: config.clientSecret }
	const metadata = { testMode: config.testMode }

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "paypal",
			name: "PayPal Payments",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspacePayPalConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "paypal")
			)
		)
}

// ============================================
// Polar Integration (BYOK)
// ============================================

export async function getWorkspacePolarConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "polar")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			accessToken: "",
			webhookSecret: "",
			testMode: true,
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
	} | null
	const metadata = integration.metadata as {
		webhookSecret?: string
		testMode?: boolean
	} | null

	return {
		hasConfig: true,
		accessToken: credentials?.apiKey || "",
		webhookSecret: metadata?.webhookSecret || "",
		testMode: metadata?.testMode ?? true,
	}
}

export async function saveWorkspacePolarConfig(config: {
	accessToken: string
	webhookSecret: string
	testMode: boolean
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "polar")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.accessToken }
	const metadata = {
		webhookSecret: config.webhookSecret,
		testMode: config.testMode,
	}

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "polar",
			name: "Polar Payments",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspacePolarConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "polar")
			)
		)
}

// ============================================
// Reown/WalletConnect Integration (BYOK)
// ============================================

export async function getWorkspaceReownConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "reown")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			projectId: "",
			chains: ["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"],
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
	} | null
	const metadata = integration.metadata as {
		chains?: string[]
	} | null

	return {
		hasConfig: true,
		projectId: credentials?.apiKey || "",
		chains: metadata?.chains || ["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"],
	}
}

export async function saveWorkspaceReownConfig(config: {
	projectId: string
	chains: string[]
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "reown")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.projectId }
	const metadata = { chains: config.chains }

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "reown",
			name: "Reown (Web3)",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspaceReownConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "reown")
			)
		)
}

// ============================================
// Shopify Integration (BYOK)
// ============================================

export async function getWorkspaceShopifyConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "shopify")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			storeDomain: "",
			storefrontToken: "",
			adminToken: "",
			testMode: true,
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
		apiSecret?: string
	} | null
	const metadata = integration.metadata as {
		storeDomain?: string
		adminToken?: string
		testMode?: boolean
	} | null

	return {
		hasConfig: true,
		storeDomain: metadata?.storeDomain || "",
		storefrontToken: credentials?.apiKey || "",
		adminToken: metadata?.adminToken || "",
		testMode: metadata?.testMode ?? true,
	}
}

export async function saveWorkspaceShopifyConfig(config: {
	storeDomain: string
	storefrontToken: string
	adminToken: string
	testMode: boolean
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "shopify")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.storefrontToken }
	const metadata = {
		storeDomain: config.storeDomain,
		adminToken: config.adminToken,
		testMode: config.testMode,
	}

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "shopify",
			name: "Shopify Payments",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspaceShopifyConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "shopify")
			)
		)
}

// ============================================
// Square Integration (BYOK)
// ============================================

export async function getWorkspaceSquareConfig() {
	const workspace = await requireWorkspace()

	const [integration] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "square")
			)
		)
		.limit(1)

	if (!integration) {
		return {
			hasConfig: false,
			applicationId: "",
			accessToken: "",
			locationId: "",
			testMode: true,
		}
	}

	const credentials = integration.credentials as {
		apiKey?: string
	} | null
	const metadata = integration.metadata as {
		applicationId?: string
		locationId?: string
		testMode?: boolean
	} | null

	return {
		hasConfig: true,
		applicationId: metadata?.applicationId || "",
		accessToken: credentials?.apiKey || "",
		locationId: metadata?.locationId || "",
		testMode: metadata?.testMode ?? true,
	}
}

export async function saveWorkspaceSquareConfig(config: {
	applicationId: string
	accessToken: string
	locationId: string
	testMode: boolean
}) {
	const workspace = await requireSettingsPermission()

	const [existing] = await db
		.select()
		.from(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "square")
			)
		)
		.limit(1)

	const credentials = { apiKey: config.accessToken }
	const metadata = {
		applicationId: config.applicationId,
		locationId: config.locationId,
		testMode: config.testMode,
	}

	if (existing) {
		await db
			.update(schema.workspaceIntegrations)
			.set({
				credentials,
				metadata,
				updatedAt: new Date(),
			})
			.where(eq(schema.workspaceIntegrations.id, existing.id))
	} else {
		await db.insert(schema.workspaceIntegrations).values({
			workspaceId: workspace.id,
			provider: "square",
			name: "Square Payments",
			authType: "api_key",
			credentials,
			metadata,
			isActive: true,
		})
	}
}

export async function deleteWorkspaceSquareConfig() {
	const workspace = await requireSettingsPermission()

	await db
		.delete(schema.workspaceIntegrations)
		.where(
			and(
				eq(schema.workspaceIntegrations.workspaceId, workspace.id),
				eq(schema.workspaceIntegrations.provider, "square")
			)
		)
}
