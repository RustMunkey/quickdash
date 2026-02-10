"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
	updateSettings,
	saveWorkspaceStripeConfig, deleteWorkspaceStripeConfig,
	saveWorkspacePayPalConfig, deleteWorkspacePayPalConfig,
	saveWorkspacePolarConfig, deleteWorkspacePolarConfig,
	saveWorkspaceReownConfig, deleteWorkspaceReownConfig,
	saveWorkspaceShopifyConfig, deleteWorkspaceShopifyConfig,
	saveWorkspaceSquareConfig, deleteWorkspaceSquareConfig,
} from "../actions"

type Setting = {
	id: string
	key: string
	value: string | null
	group: string
}

function getVal(settings: Setting[], key: string): string {
	return settings.find((s) => s.key === key)?.value || ""
}

function getBool(settings: Setting[], key: string): boolean {
	return settings.find((s) => s.key === key)?.value === "true"
}

// --- Reusable IntegrationCard ---

type IntegrationCardProps = {
	name: string
	description: string
	connected: boolean
	children: React.ReactNode
	onSave: () => Promise<void>
}

function IntegrationCard({ name, description, connected, children, onSave }: IntegrationCardProps) {
	const [expanded, setExpanded] = useState(false)
	const [saving, setSaving] = useState(false)

	async function handleSave() {
		setSaving(true)
		try {
			await onSave()
			toast.success(`${name} settings saved`)
		} catch {
			toast.error("Failed to save")
		} finally {
			setSaving(false)
		}
	}

	return (
		<Card className="py-2 gap-2 sm:py-6 sm:gap-6 rounded-lg sm:rounded-xl">
			<CardHeader className="px-3 sm:px-6">
				<div className="flex items-center justify-between gap-2 sm:gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<CardTitle className="text-xs sm:text-sm font-medium truncate">{name}</CardTitle>
							<Badge variant={connected ? "default" : "secondary"} className="text-[9px] sm:text-[10px] px-1.5 py-0 shrink-0">
								{connected ? "Connected" : "Not Set"}
							</Badge>
						</div>
						<p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">{description}</p>
					</div>
					<Button size="sm" variant="outline" className="shrink-0 text-xs h-7 px-2.5 sm:h-8 sm:px-3" onClick={() => setExpanded(!expanded)}>
						{expanded ? "Hide" : "Configure"}
					</Button>
				</div>
			</CardHeader>
			{expanded && (
				<CardContent className="space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4 px-3 sm:px-6">
					{children}
					<div className="flex justify-end">
						<Button size="sm" onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save"}
						</Button>
					</div>
				</CardContent>
			)}
		</Card>
	)
}

// --- Config types ---

type WorkspaceStripeConfig = {
	hasConfig: boolean
	secretKey: string
	publishableKey: string
	webhookSecret: string
	testMode: boolean
}

type WorkspacePayPalConfig = {
	hasConfig: boolean
	clientId: string
	clientSecret: string
	testMode: boolean
}

type WorkspacePolarConfig = {
	hasConfig: boolean
	accessToken: string
	webhookSecret: string
	testMode: boolean
}

type WorkspaceReownConfig = {
	hasConfig: boolean
	projectId: string
	chains: string[]
}

type WorkspaceShopifyConfig = {
	hasConfig: boolean
	storeDomain: string
	storefrontToken: string
	adminToken: string
	testMode: boolean
}

type WorkspaceSquareConfig = {
	hasConfig: boolean
	applicationId: string
	accessToken: string
	locationId: string
	testMode: boolean
}

// --- Constants ---

const allCoins = [
	{ id: "btc", name: "Bitcoin", symbol: "BTC" },
	{ id: "eth", name: "Ethereum", symbol: "ETH" },
	{ id: "sol", name: "Solana", symbol: "SOL" },
	{ id: "usdc", name: "USDC", symbol: "USDC" },
	{ id: "usdt", name: "USDT", symbol: "USDT" },
	{ id: "bnb", name: "BNB", symbol: "BNB" },
	{ id: "zec", name: "Zcash", symbol: "ZEC" },
	{ id: "xrp", name: "XRP", symbol: "XRP" },
]

const currencies = [
	{ code: "CAD", name: "Canadian Dollar" },
	{ code: "USD", name: "US Dollar" },
	{ code: "GBP", name: "British Pound" },
	{ code: "EUR", name: "Euro" },
	{ code: "AUD", name: "Australian Dollar" },
	{ code: "MXN", name: "Mexican Peso" },
	{ code: "JPY", name: "Japanese Yen" },
]

// --- Main component ---

export function PaymentSettings({
	settings,
	workspaceStripe,
	workspacePayPal,
	workspacePolar,
	workspaceReown,
	workspaceShopify,
	workspaceSquare,
}: {
	settings: Setting[]
	workspaceStripe: WorkspaceStripeConfig
	workspacePayPal: WorkspacePayPalConfig
	workspacePolar: WorkspacePolarConfig
	workspaceReown: WorkspaceReownConfig
	workspaceShopify: WorkspaceShopifyConfig
	workspaceSquare: WorkspaceSquareConfig
}) {
	// --- Provider state ---
	const [stripeSecretKey, setStripeSecretKey] = useState(workspaceStripe.secretKey)
	const [stripePublishableKey, setStripePublishableKey] = useState(workspaceStripe.publishableKey)
	const [stripeWebhookSecret, setStripeWebhookSecret] = useState(workspaceStripe.webhookSecret)
	const [stripeTestMode, setStripeTestMode] = useState(workspaceStripe.testMode)

	const [paypalClientId, setPaypalClientId] = useState(workspacePayPal.clientId)
	const [paypalClientSecret, setPaypalClientSecret] = useState(workspacePayPal.clientSecret)
	const [paypalTestMode, setPaypalTestMode] = useState(workspacePayPal.testMode)

	const [polarAccessToken, setPolarAccessToken] = useState(workspacePolar.accessToken)
	const [polarWebhookSecret, setPolarWebhookSecret] = useState(workspacePolar.webhookSecret)
	const [polarTestMode, setPolarTestMode] = useState(workspacePolar.testMode)

	const [reownProjectId, setReownProjectId] = useState(workspaceReown.projectId)
	const [reownChains, setReownChains] = useState<string[]>(workspaceReown.chains)

	const [shopifyDomain, setShopifyDomain] = useState(workspaceShopify.storeDomain)
	const [shopifyStorefrontToken, setShopifyStorefrontToken] = useState(workspaceShopify.storefrontToken)
	const [shopifyAdminToken, setShopifyAdminToken] = useState(workspaceShopify.adminToken)
	const [shopifyTestMode, setShopifyTestMode] = useState(workspaceShopify.testMode)

	const [squareAppId, setSquareAppId] = useState(workspaceSquare.applicationId)
	const [squareAccessToken, setSquareAccessToken] = useState(workspaceSquare.accessToken)
	const [squareLocationId, setSquareLocationId] = useState(workspaceSquare.locationId)
	const [squareTestMode, setSquareTestMode] = useState(workspaceSquare.testMode)

	// --- Payment method toggles ---
	const [cardsEnabled, setCardsEnabled] = useState(getBool(settings, "pay_cards_enabled") || !getVal(settings, "pay_cards_enabled"))
	const [applePayEnabled, setApplePayEnabled] = useState(getBool(settings, "pay_apple_pay"))
	const [googlePayEnabled, setGooglePayEnabled] = useState(getBool(settings, "pay_google_pay"))
	const [paypalEnabled, setPaypalEnabled] = useState(getBool(settings, "pay_paypal"))
	const [cryptoEnabled, setCryptoEnabled] = useState(getBool(settings, "pay_crypto_enabled"))

	// Currency
	const [defaultCurrency, setDefaultCurrency] = useState(getVal(settings, "pay_default_currency") || "CAD")
	const [acceptedCurrencies, setAcceptedCurrencies] = useState<string[]>(
		getVal(settings, "pay_accepted_currencies") ? JSON.parse(getVal(settings, "pay_accepted_currencies")) : ["CAD", "USD"]
	)

	// Accepted coins
	const [chains, setChains] = useState<string[]>(
		getVal(settings, "pay_chains") ? JSON.parse(getVal(settings, "pay_chains")) : ["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"]
	)

	// Checkout
	const [minOrder, setMinOrder] = useState(getVal(settings, "pay_min_order") || "")
	const [maxOrder, setMaxOrder] = useState(getVal(settings, "pay_max_order") || "")
	const [requireBilling, setRequireBilling] = useState(getBool(settings, "pay_require_billing"))
	const [checkoutMode, setCheckoutMode] = useState(getVal(settings, "pay_checkout_mode") || "embedded")

	const [saving, setSaving] = useState(false)

	function toggleCurrency(code: string) {
		setAcceptedCurrencies((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
		)
	}

	function toggleChain(chain: string) {
		setChains((prev) =>
			prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
		)
	}

	async function handleSave() {
		setSaving(true)
		try {
			await updateSettings([
				{ key: "pay_cards_enabled", value: String(cardsEnabled), group: "payments" },
				{ key: "pay_apple_pay", value: String(applePayEnabled), group: "payments" },
				{ key: "pay_google_pay", value: String(googlePayEnabled), group: "payments" },
				{ key: "pay_paypal", value: String(paypalEnabled), group: "payments" },
				{ key: "pay_crypto_enabled", value: String(cryptoEnabled), group: "payments" },
				{ key: "pay_default_currency", value: defaultCurrency, group: "payments" },
				{ key: "pay_accepted_currencies", value: JSON.stringify(acceptedCurrencies), group: "payments" },
				{ key: "pay_chains", value: JSON.stringify(chains), group: "payments" },
				{ key: "pay_min_order", value: minOrder, group: "payments" },
				{ key: "pay_max_order", value: maxOrder, group: "payments" },
				{ key: "pay_require_billing", value: String(requireBilling), group: "payments" },
				{ key: "pay_checkout_mode", value: checkoutMode, group: "payments" },
			])
			toast.success("Payment settings saved")
		} catch {
			toast.error("Failed to save")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<p className="text-muted-foreground text-sm"><span className="sm:hidden">Providers, methods & checkout.</span><span className="hidden sm:inline">Configure payment providers, methods, currencies, and checkout behavior.</span></p>
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save All"}
				</Button>
			</div>

			{/* ============================== */}
			{/* PAYMENT PROVIDERS (BYOK)       */}
			{/* ============================== */}

			<div className="space-y-4">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Providers</p>

				{/* Stripe */}
				<IntegrationCard
					name="Stripe"
					description="Credit card payments, Apple Pay, Google Pay, and international payment methods."
					connected={!!stripeSecretKey}
					onSave={async () => {
						await saveWorkspaceStripeConfig({
							secretKey: stripeSecretKey,
							publishableKey: stripePublishableKey,
							webhookSecret: stripeWebhookSecret,
							testMode: stripeTestMode,
						})
					}}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Secret Key</Label>
								<Input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} placeholder="sk_live_... or sk_test_..." />
								<p className="text-xs text-muted-foreground">Server-side key for processing payments.</p>
							</div>
							<div className="space-y-2">
								<Label>Publishable Key</Label>
								<Input value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} placeholder="pk_live_... or pk_test_..." />
								<p className="text-xs text-muted-foreground">Client-side key for Stripe Elements.</p>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Webhook Secret</Label>
							<Input type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} placeholder="whsec_..." />
							<p className="text-xs text-muted-foreground">For verifying webhook signatures from Stripe.</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Test Mode</Label>
								<p className="text-xs text-muted-foreground">Use Stripe test keys for development</p>
							</div>
							<Switch checked={stripeTestMode} onCheckedChange={setStripeTestMode} />
						</div>
						<p className="text-xs text-muted-foreground">
							Get your API keys from <code className="bg-muted px-1 py-0.5 rounded">dashboard.stripe.com/apikeys</code>. Payments go directly to your Stripe account.
						</p>
					</div>
					{stripeSecretKey && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspaceStripeConfig()
								setStripeSecretKey(""); setStripePublishableKey(""); setStripeWebhookSecret(""); setStripeTestMode(true)
								toast.success("Stripe config removed")
							}}>Remove Stripe Config</Button>
						</div>
					)}
				</IntegrationCard>

				{/* PayPal */}
				<IntegrationCard
					name="PayPal"
					description="PayPal checkout, Venmo, and Pay Later installment payments."
					connected={!!paypalClientId && !!paypalClientSecret}
					onSave={async () => {
						await saveWorkspacePayPalConfig({
							clientId: paypalClientId,
							clientSecret: paypalClientSecret,
							testMode: paypalTestMode,
						})
					}}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Client ID</Label>
								<Input value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="AV..." />
							</div>
							<div className="space-y-2">
								<Label>Client Secret</Label>
								<Input type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)} />
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Sandbox Mode</Label>
								<p className="text-xs text-muted-foreground">Test transactions only</p>
							</div>
							<Switch checked={paypalTestMode} onCheckedChange={setPaypalTestMode} />
						</div>
						<p className="text-xs text-muted-foreground">
							Create credentials at <code className="bg-muted px-1 py-0.5 rounded">developer.paypal.com</code>. Payments go directly to your PayPal account.
						</p>
					</div>
					{paypalClientId && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspacePayPalConfig()
								setPaypalClientId(""); setPaypalClientSecret(""); setPaypalTestMode(true)
								toast.success("PayPal config removed")
							}}>Remove PayPal Config</Button>
						</div>
					)}
				</IntegrationCard>

				{/* Polar */}
				<IntegrationCard
					name="Polar"
					description="Fiat payment processing for one-time orders and subscriptions."
					connected={!!polarAccessToken}
					onSave={async () => {
						await saveWorkspacePolarConfig({
							accessToken: polarAccessToken,
							webhookSecret: polarWebhookSecret,
							testMode: polarTestMode,
						})
					}}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Access Token</Label>
								<Input type="password" value={polarAccessToken} onChange={(e) => setPolarAccessToken(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Webhook Secret</Label>
								<Input type="password" value={polarWebhookSecret} onChange={(e) => setPolarWebhookSecret(e.target.value)} />
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Test Mode</Label>
								<p className="text-xs text-muted-foreground">Sandbox transactions only</p>
							</div>
							<Switch checked={polarTestMode} onCheckedChange={setPolarTestMode} />
						</div>
						<p className="text-xs text-muted-foreground">Payments go directly to your Polar account.</p>
					</div>
					{polarAccessToken && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspacePolarConfig()
								setPolarAccessToken(""); setPolarWebhookSecret(""); setPolarTestMode(true)
								toast.success("Polar config removed")
							}}>Remove Polar Config</Button>
						</div>
					)}
				</IntegrationCard>

				{/* Reown */}
				<IntegrationCard
					name="Reown (WalletConnect)"
					description="Cryptocurrency payments via BTC, ETH, SOL, stablecoins, and more."
					connected={!!reownProjectId}
					onSave={async () => {
						await saveWorkspaceReownConfig({
							projectId: reownProjectId,
							chains: reownChains,
						})
					}}
				>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Project ID</Label>
							<Input value={reownProjectId} onChange={(e) => setReownProjectId(e.target.value)} placeholder="your-walletconnect-project-id" />
							<p className="text-xs text-muted-foreground">
								Get your Project ID from <code className="bg-muted px-1 py-0.5 rounded">cloud.reown.com</code>.
							</p>
						</div>
						<div className="space-y-2">
							<Label>Accepted Coins</Label>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
								{[
									{ id: "btc", name: "Bitcoin (BTC)" },
									{ id: "eth", name: "Ethereum (ETH)" },
									{ id: "sol", name: "Solana (SOL)" },
									{ id: "usdc", name: "USDC" },
									{ id: "usdt", name: "USDT" },
									{ id: "bnb", name: "BNB" },
									{ id: "zec", name: "Zcash (ZEC)" },
									{ id: "xrp", name: "XRP" },
								].map((chain) => (
									<label key={chain.id} className="flex items-center gap-2 cursor-pointer">
										<Checkbox
											checked={reownChains.includes(chain.id)}
											onCheckedChange={() => setReownChains((prev) =>
												prev.includes(chain.id) ? prev.filter((c) => c !== chain.id) : [...prev, chain.id]
											)}
										/>
										<span className="text-sm">{chain.name}</span>
									</label>
								))}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">Crypto payments go directly to your wallet.</p>
					</div>
					{reownProjectId && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspaceReownConfig()
								setReownProjectId(""); setReownChains(["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"])
								toast.success("Reown config removed")
							}}>Remove Reown Config</Button>
						</div>
					)}
				</IntegrationCard>

				{/* Shopify */}
				<IntegrationCard
					name="Shopify"
					description="Redirect customers to Shopify checkout for payment and fulfillment."
					connected={!!shopifyDomain && !!shopifyStorefrontToken}
					onSave={async () => {
						await saveWorkspaceShopifyConfig({
							storeDomain: shopifyDomain,
							storefrontToken: shopifyStorefrontToken,
							adminToken: shopifyAdminToken,
							testMode: shopifyTestMode,
						})
					}}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Store Domain</Label>
								<Input value={shopifyDomain} onChange={(e) => setShopifyDomain(e.target.value)} placeholder="your-store.myshopify.com" />
								<p className="text-xs text-muted-foreground">Your Shopify store domain.</p>
							</div>
							<div className="space-y-2">
								<Label>Storefront Access Token</Label>
								<Input type="password" value={shopifyStorefrontToken} onChange={(e) => setShopifyStorefrontToken(e.target.value)} />
								<p className="text-xs text-muted-foreground">For creating checkouts via Storefront API.</p>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Admin API Access Token (optional)</Label>
							<Input type="password" value={shopifyAdminToken} onChange={(e) => setShopifyAdminToken(e.target.value)} />
							<p className="text-xs text-muted-foreground">For order sync and product management.</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Test Mode</Label>
								<p className="text-xs text-muted-foreground">Use Shopify development store</p>
							</div>
							<Switch checked={shopifyTestMode} onCheckedChange={setShopifyTestMode} />
						</div>
					</div>
					{shopifyDomain && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspaceShopifyConfig()
								setShopifyDomain(""); setShopifyStorefrontToken(""); setShopifyAdminToken(""); setShopifyTestMode(true)
								toast.success("Shopify config removed")
							}}>Remove Shopify Config</Button>
						</div>
					)}
				</IntegrationCard>

				{/* Square */}
				<IntegrationCard
					name="Square"
					description="In-person and online payments with Square checkout links."
					connected={!!squareAccessToken && !!squareLocationId}
					onSave={async () => {
						await saveWorkspaceSquareConfig({
							applicationId: squareAppId,
							accessToken: squareAccessToken,
							locationId: squareLocationId,
							testMode: squareTestMode,
						})
					}}
				>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Application ID</Label>
								<Input value={squareAppId} onChange={(e) => setSquareAppId(e.target.value)} placeholder="sq0idp-..." />
							</div>
							<div className="space-y-2">
								<Label>Access Token</Label>
								<Input type="password" value={squareAccessToken} onChange={(e) => setSquareAccessToken(e.target.value)} placeholder="EAAAl..." />
							</div>
						</div>
						<div className="space-y-2">
							<Label>Location ID</Label>
							<Input value={squareLocationId} onChange={(e) => setSquareLocationId(e.target.value)} placeholder="L..." />
							<p className="text-xs text-muted-foreground">From Square Dashboard &rarr; Locations.</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Sandbox Mode</Label>
								<p className="text-xs text-muted-foreground">Test transactions only</p>
							</div>
							<Switch checked={squareTestMode} onCheckedChange={setSquareTestMode} />
						</div>
						<p className="text-xs text-muted-foreground">
							Get credentials from <code className="bg-muted px-1 py-0.5 rounded">developer.squareup.com</code>. Payments go directly to your Square account.
						</p>
					</div>
					{squareAccessToken && (
						<div className="pt-2 border-t">
							<Button variant="destructive" size="sm" onClick={async () => {
								await deleteWorkspaceSquareConfig()
								setSquareAppId(""); setSquareAccessToken(""); setSquareLocationId(""); setSquareTestMode(true)
								toast.success("Square config removed")
							}}>Remove Square Config</Button>
						</div>
					)}
				</IntegrationCard>
			</div>

			{/* ============================== */}
			{/* PAYMENT METHOD TOGGLES         */}
			{/* ============================== */}

			<Card>
				<CardHeader>
					<CardTitle>Payment Methods</CardTitle>
					<CardDescription>Enable or disable payment options at checkout.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Credit & Debit Cards</Label>
							<p className="text-xs text-muted-foreground">Visa, Mastercard, Amex via Stripe or Polar</p>
						</div>
						<Switch checked={cardsEnabled} onCheckedChange={setCardsEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Apple Pay</Label>
							<p className="text-xs text-muted-foreground">One-tap checkout on Safari and iOS devices</p>
						</div>
						<Switch checked={applePayEnabled} onCheckedChange={setApplePayEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Google Pay</Label>
							<p className="text-xs text-muted-foreground">One-tap checkout on Chrome and Android</p>
						</div>
						<Switch checked={googlePayEnabled} onCheckedChange={setGooglePayEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>PayPal</Label>
							<p className="text-xs text-muted-foreground">PayPal balance, Venmo, and Pay Later</p>
						</div>
						<Switch checked={paypalEnabled} onCheckedChange={setPaypalEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Cryptocurrency</Label>
							<p className="text-xs text-muted-foreground">Multi-chain wallet payments via Reown</p>
						</div>
						<Switch checked={cryptoEnabled} onCheckedChange={setCryptoEnabled} />
					</div>
				</CardContent>
			</Card>

			{/* ============================== */}
			{/* CURRENCY                        */}
			{/* ============================== */}

			<Card>
				<CardHeader>
					<CardTitle>Currency</CardTitle>
					<CardDescription>Set your store currency and accepted payment currencies.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Default Currency</Label>
						<Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
							<SelectTrigger className="w-full sm:w-[240px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{currencies.map((c) => (
									<SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Accepted Currencies</Label>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{currencies.map((c) => (
								<label key={c.code} className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={acceptedCurrencies.includes(c.code)}
										onCheckedChange={() => toggleCurrency(c.code)}
									/>
									<span className="text-sm">{c.code}</span>
								</label>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ============================== */}
			{/* ACCEPTED COINS                  */}
			{/* ============================== */}

			{cryptoEnabled && (
				<Card>
					<CardHeader>
						<CardTitle>Accepted Coins</CardTitle>
						<CardDescription>Select which cryptocurrencies to accept at checkout.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							{allCoins.map((coin) => (
								<label key={coin.id} className="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={chains.includes(coin.id)}
										onCheckedChange={() => toggleChain(coin.id)}
									/>
									<div className="flex flex-col">
										<span className="text-sm">{coin.name}</span>
										<span className="text-[10px] text-muted-foreground">{coin.symbol}</span>
									</div>
								</label>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* ============================== */}
			{/* CHECKOUT                        */}
			{/* ============================== */}

			<Card>
				<CardHeader>
					<CardTitle>Checkout</CardTitle>
					<CardDescription>Order limits and checkout behavior.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Minimum Order ({defaultCurrency})</Label>
							<Input
								type="number"
								step="0.01"
								value={minOrder}
								onChange={(e) => setMinOrder(e.target.value)}
								placeholder="No minimum"
							/>
						</div>
						<div className="space-y-2">
							<Label>Maximum Order ({defaultCurrency})</Label>
							<Input
								type="number"
								step="0.01"
								value={maxOrder}
								onChange={(e) => setMaxOrder(e.target.value)}
								placeholder="No maximum"
							/>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Require Billing Address</Label>
							<p className="text-xs text-muted-foreground">Collect billing address separately from shipping</p>
						</div>
						<Switch checked={requireBilling} onCheckedChange={setRequireBilling} />
					</div>
					<div className="space-y-2">
						<Label>Checkout Mode</Label>
						<Select value={checkoutMode} onValueChange={setCheckoutMode}>
							<SelectTrigger className="w-full sm:w-[240px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="embedded">Embedded (on-site)</SelectItem>
								<SelectItem value="redirect">Redirect (hosted checkout)</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Embedded keeps customers on your site. Redirect uses the provider's hosted checkout page.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
