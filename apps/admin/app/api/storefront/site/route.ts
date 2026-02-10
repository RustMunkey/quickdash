import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { storeSettings, workspaces, workspaceIntegrations } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

// Public settings that storefronts can access (matches admin settings keys)
const PUBLIC_SETTING_KEYS = [
	// Store Info
	"store_name",
	"store_tagline",
	"store_logo_url",
	"store_favicon_url",
	// Contact
	"contact_email",
	"contact_phone",
	"contact_support_email",
	// Address
	"address_street",
	"address_city",
	"address_province",
	"address_country",
	"address_postal",
	// Locale
	"currency",
	"timezone",
	"weight_unit",
	"dimension_unit",
	"date_format",
	// SEO
	"seo_meta_title",
	"seo_meta_description",
	"seo_social_image",
	// Social
	"social_instagram",
	"social_twitter",
	"social_facebook",
	"social_tiktok",
	"social_youtube",
	"social_pinterest",
	"social_linkedin",
	"social_discord",
	// Legal
	"legal_privacy_url",
	"legal_terms_url",
	"legal_refund_url",
	"legal_cookie_url",
	"legal_shipping_url",
	"legal_returns_url",
	"legal_accessibility_url",
	// Page URLs
	"page_about_url",
	"page_contact_url",
	"page_faq_url",
	// Shipping
	"shipping_free_threshold",
	// Storefront Display
	"storefront_products_per_page",
	"storefront_default_sort",
	"storefront_show_stock",
	"storefront_show_sold",
	"storefront_quick_view",
	"storefront_infinite_scroll",
	// Checkout
	"checkout_guest",
	"checkout_require_phone",
	"checkout_terms_required",
	"checkout_age_verification",
	// Products
	"products_reviews",
	"products_ratings",
	"products_compare",
	"products_wishlist",
	// Maintenance
	"maintenance_mode",
	"maintenance_message",
]

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: "$",
	CAD: "$",
	EUR: "€",
	GBP: "£",
	JPY: "¥",
	AUD: "$",
	MXN: "$",
	BRL: "R$",
	INR: "₹",
	CNY: "¥",
	KRW: "₩",
	CHF: "CHF",
	SEK: "kr",
	NOK: "kr",
	DKK: "kr",
	NZD: "$",
	SGD: "$",
	HKD: "$",
	ZAR: "R",
	AED: "د.إ",
}

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	// Get all public settings for this workspace
	const settings = await db
		.select({
			key: storeSettings.key,
			value: storeSettings.value,
		})
		.from(storeSettings)
		.where(eq(storeSettings.workspaceId, storefront.workspaceId))

	// Filter to only public keys and convert to object
	const s: Record<string, string | null> = {}
	for (const setting of settings) {
		if (PUBLIC_SETTING_KEYS.includes(setting.key)) {
			s[setting.key] = setting.value
		}
	}

	// Also get workspace info for defaults
	const [workspace] = await db
		.select({
			name: workspaces.name,
			logo: workspaces.logo,
			primaryColor: workspaces.primaryColor,
			description: workspaces.description,
		})
		.from(workspaces)
		.where(eq(workspaces.id, storefront.workspaceId))
		.limit(1)

	const currency = s.currency || "CAD"

	return Response.json({
		site: {
			// Store Info
			name: s.store_name || workspace?.name || storefront.name,
			tagline: s.store_tagline || null,
			logo: s.store_logo_url || workspace?.logo || null,
			favicon: s.store_favicon_url || null,

			// Contact
			contact: {
				email: s.contact_email || null,
				phone: s.contact_phone || null,
				supportEmail: s.contact_support_email || null,
			},

			// Address
			address: {
				street: s.address_street || null,
				city: s.address_city || null,
				province: s.address_province || null,
				country: s.address_country || null,
				postal: s.address_postal || null,
				formatted: formatAddress(s),
			},

			// Locale
			locale: {
				currency,
				currencySymbol: CURRENCY_SYMBOLS[currency] || "$",
				timezone: s.timezone || "America/Toronto",
				weightUnit: s.weight_unit || "kg",
				dimensionUnit: s.dimension_unit || "cm",
				dateFormat: s.date_format || "MMM d, yyyy",
			},

			// Social Links
			social: {
				instagram: s.social_instagram || null,
				twitter: s.social_twitter || null,
				facebook: s.social_facebook || null,
				tiktok: s.social_tiktok || null,
				youtube: s.social_youtube || null,
				pinterest: s.social_pinterest || null,
				linkedin: s.social_linkedin || null,
				discord: s.social_discord || null,
			},

			// Theme
			theme: {
				primaryColor: workspace?.primaryColor || "#000000",
			},

			// SEO
			seo: {
				title: s.seo_meta_title || s.store_name || workspace?.name || null,
				description: s.seo_meta_description || null,
				socialImage: s.seo_social_image || null,
			},

			// Legal URLs
			legal: {
				privacyUrl: s.legal_privacy_url || null,
				termsUrl: s.legal_terms_url || null,
				refundUrl: s.legal_refund_url || null,
				cookieUrl: s.legal_cookie_url || null,
				shippingUrl: s.legal_shipping_url || null,
				returnsUrl: s.legal_returns_url || null,
				accessibilityUrl: s.legal_accessibility_url || null,
			},

			// Page URLs
			pages: {
				aboutUrl: s.page_about_url || null,
				contactUrl: s.page_contact_url || null,
				faqUrl: s.page_faq_url || null,
			},

			// Features
			features: {
				freeShippingThreshold: s.shipping_free_threshold
					? parseFloat(s.shipping_free_threshold)
					: null,
				guestCheckout: s.checkout_guest === "true",
				requirePhone: s.checkout_require_phone === "true",
				termsRequired: s.checkout_terms_required === "true",
				ageVerification: s.checkout_age_verification === "true",
				reviews: s.products_reviews !== "false",
				ratings: s.products_ratings !== "false",
				compare: s.products_compare === "true",
				wishlist: s.products_wishlist === "true",
				quickView: s.storefront_quick_view === "true",
				infiniteScroll: s.storefront_infinite_scroll === "true",
			},

			// Storefront Display
			display: {
				productsPerPage: parseInt(s.storefront_products_per_page || "24"),
				defaultSort: s.storefront_default_sort || "newest",
				showStock: s.storefront_show_stock === "true",
				showSold: s.storefront_show_sold === "true",
			},

			// Maintenance mode
			maintenance: {
				enabled: s.maintenance_mode === "true",
				message: s.maintenance_message || "We'll be back soon.",
			},

			// Payment methods (which providers are configured)
			payments: await getPaymentMethods(storefront.workspaceId, s),
		},
	})
}

// Format address into a single string
function formatAddress(s: Record<string, string | null>): string | null {
	const parts = [
		s.address_street,
		s.address_city,
		s.address_province,
		s.address_postal,
		s.address_country,
	].filter(Boolean)
	return parts.length > 0 ? parts.join(", ") : null
}

const PAYMENT_PROVIDERS = ["stripe", "paypal", "polar", "reown", "shopify", "square"] as const

async function getPaymentMethods(workspaceId: string, s: Record<string, string | null>) {
	const integrations = await db
		.select({
			provider: workspaceIntegrations.provider,
			credentials: workspaceIntegrations.credentials,
			metadata: workspaceIntegrations.metadata,
		})
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.isActive, true)
			)
		)

	const methods: Record<string, unknown>[] = []

	for (const integration of integrations) {
		const provider = integration.provider
		if (!PAYMENT_PROVIDERS.includes(provider as any)) continue

		const creds = integration.credentials as Record<string, any> | null
		const meta = integration.metadata as Record<string, any> | null
		if (!creds?.apiKey) continue

		switch (provider) {
			case "stripe":
				if (s.pay_cards_enabled === "false") break
				methods.push({ provider: "stripe", type: "cards", publishableKey: meta?.publishableKey || "" })
				break
			case "paypal":
				if (s.pay_paypal === "false") break
				methods.push({ provider: "paypal", type: "paypal", clientId: creds.apiKey, mode: meta?.testMode !== false ? "sandbox" : "live" })
				break
			case "polar":
				methods.push({ provider: "polar", type: "fiat", mode: meta?.testMode !== false ? "sandbox" : "production" })
				break
			case "reown":
				if (s.pay_crypto_enabled === "false") break
				methods.push({ provider: "reown", type: "crypto", projectId: creds.apiKey, chains: meta?.chains ?? [] })
				break
			case "shopify":
				methods.push({ provider: "shopify", type: "shopify" })
				break
			case "square":
				methods.push({ provider: "square", type: "square", applicationId: creds.apiKey })
				break
		}
	}

	return {
		methods,
		currency: s.pay_default_currency || s.currency || "CAD",
		acceptedCurrencies: s.pay_accepted_currencies ? JSON.parse(s.pay_accepted_currencies) : ["CAD", "USD"],
	}
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
