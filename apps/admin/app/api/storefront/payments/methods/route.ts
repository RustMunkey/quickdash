import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, inArray } from "@quickdash/db/drizzle"
import { workspaceIntegrations, storeSettings } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

const PAYMENT_PROVIDERS = ["stripe", "paypal", "polar", "reown", "shopify", "square"] as const

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	// Get all active payment integrations for this workspace
	const integrations = await db
		.select({
			provider: workspaceIntegrations.provider,
			credentials: workspaceIntegrations.credentials,
			metadata: workspaceIntegrations.metadata,
		})
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, storefront.workspaceId),
				eq(workspaceIntegrations.isActive, true)
			)
		)

	// Get payment settings (toggles)
	const settings = await db
		.select({ key: storeSettings.key, value: storeSettings.value })
		.from(storeSettings)
		.where(eq(storeSettings.workspaceId, storefront.workspaceId))

	const s = (key: string) => settings.find((x) => x.key === key)?.value

	// Build available methods — only include providers that have credentials AND are toggled on
	const methods: Record<string, unknown>[] = []

	for (const integration of integrations) {
		const provider = integration.provider
		if (!PAYMENT_PROVIDERS.includes(provider as any)) continue

		const creds = integration.credentials as Record<string, any> | null
		const meta = integration.metadata as Record<string, any> | null
		if (!creds?.apiKey) continue

		switch (provider) {
			case "stripe": {
				if (s("pay_cards_enabled") === "false") break
				methods.push({
					provider: "stripe",
					type: "cards",
					publishableKey: meta?.publishableKey || "",
					testMode: meta?.testMode ?? true,
				})
				break
			}
			case "paypal": {
				if (s("pay_paypal") === "false") break
				methods.push({
					provider: "paypal",
					type: "paypal",
					clientId: creds.apiKey,
					mode: meta?.testMode !== false ? "sandbox" : "live",
				})
				break
			}
			case "polar": {
				methods.push({
					provider: "polar",
					type: "fiat",
					mode: meta?.testMode !== false ? "sandbox" : "production",
				})
				break
			}
			case "reown": {
				if (s("pay_crypto_enabled") === "false") break
				methods.push({
					provider: "reown",
					type: "crypto",
					projectId: creds.apiKey,
					chains: meta?.chains ?? ["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"],
				})
				break
			}
			case "shopify": {
				methods.push({
					provider: "shopify",
					type: "shopify",
					storeDomain: meta?.storeDomain || "",
				})
				break
			}
			case "square": {
				methods.push({
					provider: "square",
					type: "square",
					applicationId: creds.apiKey,
					mode: meta?.testMode !== false ? "sandbox" : "live",
				})
				break
			}
		}
	}

	return Response.json({
		methods,
		currency: s("pay_default_currency") || "CAD",
		acceptedCurrencies: s("pay_accepted_currencies") ? JSON.parse(s("pay_accepted_currencies")!) : ["CAD", "USD"],
		minOrder: s("pay_min_order") ? parseFloat(s("pay_min_order")!) : null,
		maxOrder: s("pay_max_order") ? parseFloat(s("pay_max_order")!) : null,
	})
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
