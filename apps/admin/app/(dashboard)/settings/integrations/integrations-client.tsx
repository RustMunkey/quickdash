"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateSettings, saveWorkspaceEmailConfig, deleteWorkspaceEmailConfig, saveWorkspaceStripeConfig, deleteWorkspaceStripeConfig, saveWorkspacePayPalConfig, deleteWorkspacePayPalConfig, saveWorkspacePolarConfig, deleteWorkspacePolarConfig, saveWorkspaceReownConfig, deleteWorkspaceReownConfig } from "../actions"

type Setting = {
	id: string
	key: string
	value: string | null
	group: string
}

function getVal(settings: Setting[], key: string): string {
	return settings.find((s) => s.key === key)?.value || ""
}

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

type WorkspaceEmailConfig = {
	hasCustomConfig: boolean
	apiKey: string
	fromEmail: string
	fromName: string
	replyTo: string
}

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

export function IntegrationsClient({ settings, workspaceEmail, workspaceStripe, workspacePayPal, workspacePolar, workspaceReown }: { settings: Setting[]; workspaceEmail: WorkspaceEmailConfig; workspaceStripe: WorkspaceStripeConfig; workspacePayPal: WorkspacePayPalConfig; workspacePolar: WorkspacePolarConfig; workspaceReown: WorkspaceReownConfig }) {
	// Workspace Email (BYOK)
	const [wsEmailApiKey, setWsEmailApiKey] = useState(workspaceEmail.apiKey)
	const [wsEmailFromEmail, setWsEmailFromEmail] = useState(workspaceEmail.fromEmail)
	const [wsEmailFromName, setWsEmailFromName] = useState(workspaceEmail.fromName)
	const [wsEmailReplyTo, setWsEmailReplyTo] = useState(workspaceEmail.replyTo)

	// Stripe (Workspace BYOK)
	const [stripeSecretKey, setStripeSecretKey] = useState(workspaceStripe.secretKey)
	const [stripePublishableKey, setStripePublishableKey] = useState(workspaceStripe.publishableKey)
	const [stripeWebhookSecret, setStripeWebhookSecret] = useState(workspaceStripe.webhookSecret)
	const [stripeTestMode, setStripeTestMode] = useState(workspaceStripe.testMode)

	// Polar (Workspace BYOK)
	const [polarAccessToken, setPolarAccessToken] = useState(workspacePolar.accessToken)
	const [polarWebhookSecret, setPolarWebhookSecret] = useState(workspacePolar.webhookSecret)
	const [polarTestMode, setPolarTestMode] = useState(workspacePolar.testMode)

	// PayPal (Workspace BYOK)
	const [paypalClientId, setPaypalClientId] = useState(workspacePayPal.clientId)
	const [paypalClientSecret, setPaypalClientSecret] = useState(workspacePayPal.clientSecret)
	const [paypalTestMode, setPaypalTestMode] = useState(workspacePayPal.testMode)

	// Reown (Workspace BYOK)
	const [reownProjectId, setReownProjectId] = useState(workspaceReown.projectId)
	const [reownChains, setReownChains] = useState<string[]>(workspaceReown.chains)

	// Klaviyo (user's email marketing)
	const [klaviyoApiKey, setKlaviyoApiKey] = useState(getVal(settings, "klaviyo_api_key"))
	const [klaviyoPublicKey, setKlaviyoPublicKey] = useState(getVal(settings, "klaviyo_public_key"))

	// Google Analytics (user's storefront analytics)
	const [gaMeasurementId, setGaMeasurementId] = useState(getVal(settings, "ga_measurement_id"))

	// Meta Pixel (user's ad tracking)
	const [metaPixelId, setMetaPixelId] = useState(getVal(settings, "meta_pixel_id"))
	const [metaConversionsToken, setMetaConversionsToken] = useState(getVal(settings, "meta_conversions_token"))

	// TikTok Pixel (user's ad tracking)
	const [tiktokPixelId, setTiktokPixelId] = useState(getVal(settings, "tiktok_pixel_id"))
	const [tiktokAccessToken, setTiktokAccessToken] = useState(getVal(settings, "tiktok_access_token"))

	// Google Maps (user's address autocomplete)
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState(getVal(settings, "google_maps_api_key"))

	// Crisp (user's live chat)
	const [crispWebsiteId, setCrispWebsiteId] = useState(getVal(settings, "crisp_website_id"))

	// Google Ads (conversion tracking)
	const [googleAdsConversionId, setGoogleAdsConversionId] = useState(getVal(settings, "google_ads_conversion_id"))
	const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState(getVal(settings, "google_ads_conversion_label"))

	// Pinterest Tag (ad tracking)
	const [pinterestTagId, setPinterestTagId] = useState(getVal(settings, "pinterest_tag_id"))

	// Snapchat Pixel (ad tracking)
	const [snapchatPixelId, setSnapchatPixelId] = useState(getVal(settings, "snapchat_pixel_id"))
	const [snapchatApiToken, setSnapchatApiToken] = useState(getVal(settings, "snapchat_api_token"))

	// Twilio (SMS notifications & marketing)
	const [twilioAccountSid, setTwilioAccountSid] = useState(getVal(settings, "twilio_account_sid"))
	const [twilioAuthToken, setTwilioAuthToken] = useState(getVal(settings, "twilio_auth_token"))
	const [twilioFromNumber, setTwilioFromNumber] = useState(getVal(settings, "twilio_from_number"))

	// EasyPost (shipping rates & labels)
	const [easypostApiKey, setEasypostApiKey] = useState(getVal(settings, "easypost_api_key"))
	const [easypostTestMode, setEasypostTestMode] = useState(getVal(settings, "easypost_test_mode") === "true")

	// Cloudflare Turnstile (bot protection)
	const [turnstileSiteKey, setTurnstileSiteKey] = useState(getVal(settings, "turnstile_site_key"))
	const [turnstileSecretKey, setTurnstileSecretKey] = useState(getVal(settings, "turnstile_secret_key"))

	// Algolia (storefront search)
	const [algoliaAppId, setAlgoliaAppId] = useState(getVal(settings, "algolia_app_id"))
	const [algoliaAdminKey, setAlgoliaAdminKey] = useState(getVal(settings, "algolia_admin_key"))
	const [algoliaSearchKey, setAlgoliaSearchKey] = useState(getVal(settings, "algolia_search_key"))

	return (
		<div className="space-y-6">
			<p className="text-muted-foreground text-sm">Connect your own third-party services to power your storefront.</p>

			<div className="space-y-4">
				{/* --- PAYMENTS --- */}
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Payments</p>

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
								<Input
									type="password"
									value={stripeSecretKey}
									onChange={(e) => setStripeSecretKey(e.target.value)}
									placeholder="sk_live_... or sk_test_..."
								/>
								<p className="text-xs text-muted-foreground">Server-side key for processing payments.</p>
							</div>
							<div className="space-y-2">
								<Label>Publishable Key</Label>
								<Input
									value={stripePublishableKey}
									onChange={(e) => setStripePublishableKey(e.target.value)}
									placeholder="pk_live_... or pk_test_..."
								/>
								<p className="text-xs text-muted-foreground">Client-side key for Stripe Elements.</p>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Webhook Secret</Label>
							<Input
								type="password"
								value={stripeWebhookSecret}
								onChange={(e) => setStripeWebhookSecret(e.target.value)}
								placeholder="whsec_..."
							/>
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
							<Button
								variant="destructive"
								size="sm"
								onClick={async () => {
									await deleteWorkspaceStripeConfig()
									setStripeSecretKey("")
									setStripePublishableKey("")
									setStripeWebhookSecret("")
									setStripeTestMode(true)
									toast.success("Stripe config removed")
								}}
							>
								Remove Stripe Config
							</Button>
						</div>
					)}
				</IntegrationCard>

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
								<Input
									value={paypalClientId}
									onChange={(e) => setPaypalClientId(e.target.value)}
									placeholder="AV..."
								/>
							</div>
							<div className="space-y-2">
								<Label>Client Secret</Label>
								<Input
									type="password"
									value={paypalClientSecret}
									onChange={(e) => setPaypalClientSecret(e.target.value)}
								/>
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
							<Button
								variant="destructive"
								size="sm"
								onClick={async () => {
									await deleteWorkspacePayPalConfig()
									setPaypalClientId("")
									setPaypalClientSecret("")
									setPaypalTestMode(true)
									toast.success("PayPal config removed")
								}}
							>
								Remove PayPal Config
							</Button>
						</div>
					)}
				</IntegrationCard>

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
								<Input
									type="password"
									value={polarAccessToken}
									onChange={(e) => setPolarAccessToken(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label>Webhook Secret</Label>
								<Input
									type="password"
									value={polarWebhookSecret}
									onChange={(e) => setPolarWebhookSecret(e.target.value)}
								/>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Test Mode</Label>
								<p className="text-xs text-muted-foreground">Sandbox transactions only</p>
							</div>
							<Switch checked={polarTestMode} onCheckedChange={setPolarTestMode} />
						</div>
						<p className="text-xs text-muted-foreground">
							Payments go directly to your Polar account.
						</p>
					</div>
					{polarAccessToken && (
						<div className="pt-2 border-t">
							<Button
								variant="destructive"
								size="sm"
								onClick={async () => {
									await deleteWorkspacePolarConfig()
									setPolarAccessToken("")
									setPolarWebhookSecret("")
									setPolarTestMode(true)
									toast.success("Polar config removed")
								}}
							>
								Remove Polar Config
							</Button>
						</div>
					)}
				</IntegrationCard>

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
							<Input
								value={reownProjectId}
								onChange={(e) => setReownProjectId(e.target.value)}
								placeholder="your-walletconnect-project-id"
							/>
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
						<p className="text-xs text-muted-foreground">
							Crypto payments go directly to your wallet.
						</p>
					</div>
					{reownProjectId && (
						<div className="pt-2 border-t">
							<Button
								variant="destructive"
								size="sm"
								onClick={async () => {
									await deleteWorkspaceReownConfig()
									setReownProjectId("")
									setReownChains(["btc", "eth", "sol", "usdc", "usdt", "bnb", "zec", "xrp"])
									toast.success("Reown config removed")
								}}
							>
								Remove Reown Config
							</Button>
						</div>
					)}
				</IntegrationCard>

				{/* --- EMAIL & MARKETING --- */}
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">Email & Marketing</p>

				<IntegrationCard
					name="Email (Resend)"
					description="Send emails from your own domain for order confirmations, shipping updates, and marketing."
					connected={!!wsEmailApiKey}
					onSave={async () => {
						await saveWorkspaceEmailConfig({
							apiKey: wsEmailApiKey,
							fromEmail: wsEmailFromEmail,
							fromName: wsEmailFromName,
							replyTo: wsEmailReplyTo,
						})
					}}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Resend API Key</Label>
							<Input
								type="password"
								value={wsEmailApiKey}
								onChange={(e) => setWsEmailApiKey(e.target.value)}
								placeholder="re_..."
							/>
							<p className="text-xs text-muted-foreground">
								Get this from your <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Resend dashboard</a>.
							</p>
						</div>
						<div className="space-y-2">
							<Label>From Email</Label>
							<Input
								value={wsEmailFromEmail}
								onChange={(e) => setWsEmailFromEmail(e.target.value)}
								placeholder="hello@yourdomain.com"
							/>
							<p className="text-xs text-muted-foreground">Must be verified in your Resend account.</p>
						</div>
						<div className="space-y-2">
							<Label>From Name (optional)</Label>
							<Input
								value={wsEmailFromName}
								onChange={(e) => setWsEmailFromName(e.target.value)}
								placeholder="Your Company"
							/>
						</div>
						<div className="space-y-2">
							<Label>Reply-To (optional)</Label>
							<Input
								value={wsEmailReplyTo}
								onChange={(e) => setWsEmailReplyTo(e.target.value)}
								placeholder="support@yourdomain.com"
							/>
						</div>
					</div>
					{wsEmailApiKey && (
						<div className="pt-2 border-t">
							<Button
								variant="destructive"
								size="sm"
								onClick={async () => {
									await deleteWorkspaceEmailConfig()
									setWsEmailApiKey("")
									setWsEmailFromEmail("")
									setWsEmailFromName("")
									setWsEmailReplyTo("")
									toast.success("Email config removed")
								}}
							>
								Remove Email Config
							</Button>
						</div>
					)}
				</IntegrationCard>

				<IntegrationCard
					name="Klaviyo"
					description="Email marketing automation for abandoned cart flows and post-purchase sequences."
					connected={!!klaviyoApiKey}
					onSave={() => updateSettings([
						{ key: "klaviyo_api_key", value: klaviyoApiKey, group: "integrations" },
						{ key: "klaviyo_public_key", value: klaviyoPublicKey, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Private API Key</Label>
							<Input
								type="password"
								value={klaviyoApiKey}
								onChange={(e) => setKlaviyoApiKey(e.target.value)}
								placeholder="pk_..."
							/>
							<p className="text-xs text-muted-foreground">Server-side key for syncing customer and order data.</p>
						</div>
						<div className="space-y-2">
							<Label>Public API Key / Site ID</Label>
							<Input
								value={klaviyoPublicKey}
								onChange={(e) => setKlaviyoPublicKey(e.target.value)}
								placeholder="AbCdEf"
							/>
							<p className="text-xs text-muted-foreground">Client-side key for on-site tracking.</p>
						</div>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Twilio"
					description="SMS order notifications, shipping updates, and marketing messages."
					connected={!!twilioAccountSid}
					onSave={() => updateSettings([
						{ key: "twilio_account_sid", value: twilioAccountSid, group: "integrations" },
						{ key: "twilio_auth_token", value: twilioAuthToken, group: "integrations" },
						{ key: "twilio_from_number", value: twilioFromNumber, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Account SID</Label>
							<Input
								value={twilioAccountSid}
								onChange={(e) => setTwilioAccountSid(e.target.value)}
								placeholder="AC..."
							/>
						</div>
						<div className="space-y-2">
							<Label>Auth Token</Label>
							<Input
								type="password"
								value={twilioAuthToken}
								onChange={(e) => setTwilioAuthToken(e.target.value)}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label>From Number</Label>
							<Input
								value={twilioFromNumber}
								onChange={(e) => setTwilioFromNumber(e.target.value)}
								placeholder="+1234567890"
							/>
							<p className="text-xs text-muted-foreground">
								Get credentials from <code className="bg-muted px-1 py-0.5 rounded">console.twilio.com</code>. SMS messages are sent from your Twilio account.
							</p>
						</div>
					</div>
				</IntegrationCard>

				{/* --- ANALYTICS & TRACKING --- */}
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">Analytics & Tracking</p>

				<IntegrationCard
					name="Google Analytics"
					description="Ecommerce conversion tracking and traffic analysis for your storefront."
					connected={!!gaMeasurementId}
					onSave={() => updateSettings([
						{ key: "ga_measurement_id", value: gaMeasurementId, group: "integrations" },
					])}
				>
					<div className="space-y-2">
						<Label>Measurement ID (GA4)</Label>
						<Input
							value={gaMeasurementId}
							onChange={(e) => setGaMeasurementId(e.target.value)}
							placeholder="G-XXXXXXXXXX"
						/>
						<p className="text-xs text-muted-foreground">
							From Google Analytics → Admin → Data Streams.
						</p>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Meta Pixel"
					description="Facebook and Instagram ad conversion tracking and retargeting."
					connected={!!metaPixelId}
					onSave={() => updateSettings([
						{ key: "meta_pixel_id", value: metaPixelId, group: "integrations" },
						{ key: "meta_conversions_token", value: metaConversionsToken, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Pixel ID</Label>
							<Input
								value={metaPixelId}
								onChange={(e) => setMetaPixelId(e.target.value)}
								placeholder="123456789012345"
							/>
						</div>
						<div className="space-y-2">
							<Label>Conversions API Token</Label>
							<Input
								type="password"
								value={metaConversionsToken}
								onChange={(e) => setMetaConversionsToken(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">Server-side tracking for iOS 14+ accuracy.</p>
						</div>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="TikTok Pixel"
					description="TikTok ad conversion tracking and retargeting."
					connected={!!tiktokPixelId}
					onSave={() => updateSettings([
						{ key: "tiktok_pixel_id", value: tiktokPixelId, group: "integrations" },
						{ key: "tiktok_access_token", value: tiktokAccessToken, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Pixel ID</Label>
							<Input
								value={tiktokPixelId}
								onChange={(e) => setTiktokPixelId(e.target.value)}
								placeholder="C..."
							/>
						</div>
						<div className="space-y-2">
							<Label>Events API Access Token</Label>
							<Input
								type="password"
								value={tiktokAccessToken}
								onChange={(e) => setTiktokAccessToken(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">Server-side tracking for accurate attribution.</p>
						</div>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Google Ads"
					description="Google Ads conversion tracking for search, shopping, and display campaigns."
					connected={!!googleAdsConversionId}
					onSave={() => updateSettings([
						{ key: "google_ads_conversion_id", value: googleAdsConversionId, group: "integrations" },
						{ key: "google_ads_conversion_label", value: googleAdsConversionLabel, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Conversion ID</Label>
							<Input
								value={googleAdsConversionId}
								onChange={(e) => setGoogleAdsConversionId(e.target.value)}
								placeholder="AW-123456789"
							/>
						</div>
						<div className="space-y-2">
							<Label>Conversion Label</Label>
							<Input
								value={googleAdsConversionLabel}
								onChange={(e) => setGoogleAdsConversionLabel(e.target.value)}
								placeholder="AbCdEfGhIjK"
							/>
							<p className="text-xs text-muted-foreground">
								From Google Ads → Tools → Conversions → Tag setup.
							</p>
						</div>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Pinterest Tag"
					description="Pinterest ad conversion tracking and retargeting for product discovery."
					connected={!!pinterestTagId}
					onSave={() => updateSettings([
						{ key: "pinterest_tag_id", value: pinterestTagId, group: "integrations" },
					])}
				>
					<div className="space-y-2">
						<Label>Tag ID</Label>
						<Input
							value={pinterestTagId}
							onChange={(e) => setPinterestTagId(e.target.value)}
							placeholder="123456789012"
						/>
						<p className="text-xs text-muted-foreground">
							From Pinterest Business → Ads → Conversions → Tag Manager.
						</p>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Snapchat Pixel"
					description="Snapchat ad conversion tracking and audience retargeting."
					connected={!!snapchatPixelId}
					onSave={() => updateSettings([
						{ key: "snapchat_pixel_id", value: snapchatPixelId, group: "integrations" },
						{ key: "snapchat_api_token", value: snapchatApiToken, group: "integrations" },
					])}
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Pixel ID</Label>
							<Input
								value={snapchatPixelId}
								onChange={(e) => setSnapchatPixelId(e.target.value)}
								placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							/>
						</div>
						<div className="space-y-2">
							<Label>Conversions API Token</Label>
							<Input
								type="password"
								value={snapchatApiToken}
								onChange={(e) => setSnapchatApiToken(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">Server-side tracking for improved attribution.</p>
						</div>
					</div>
				</IntegrationCard>

				{/* --- SHIPPING --- */}
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">Shipping</p>

				<IntegrationCard
					name="EasyPost"
					description="Shipping rate calculation, label printing, and package tracking across carriers."
					connected={!!easypostApiKey}
					onSave={() => updateSettings([
						{ key: "easypost_api_key", value: easypostApiKey, group: "integrations" },
						{ key: "easypost_test_mode", value: easypostTestMode ? "true" : "false", group: "integrations" },
					])}
				>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>API Key</Label>
							<Input
								type="password"
								value={easypostApiKey}
								onChange={(e) => setEasypostApiKey(e.target.value)}
								placeholder="EZ..."
							/>
							<p className="text-xs text-muted-foreground">
								Get your API key from <code className="bg-muted px-1 py-0.5 rounded">easypost.com/account/api-keys</code>.
							</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Test Mode</Label>
								<p className="text-xs text-muted-foreground">Use test API key for development</p>
							</div>
							<Switch checked={easypostTestMode} onCheckedChange={setEasypostTestMode} />
						</div>
					</div>
				</IntegrationCard>

				{/* --- STOREFRONT FEATURES --- */}
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-4">Storefront Features</p>

				<IntegrationCard
					name="Google Maps"
					description="Address autocomplete at checkout and shipping validation."
					connected={!!googleMapsApiKey}
					onSave={() => updateSettings([
						{ key: "google_maps_api_key", value: googleMapsApiKey, group: "integrations" },
					])}
				>
					<div className="space-y-2">
						<Label>API Key</Label>
						<Input
							type="password"
							value={googleMapsApiKey}
							onChange={(e) => setGoogleMapsApiKey(e.target.value)}
							placeholder="AIza..."
						/>
						<p className="text-xs text-muted-foreground">
							Enable Places API and Geocoding API in Google Cloud Console.
						</p>
					</div>
				</IntegrationCard>

				<IntegrationCard
					name="Crisp"
					description="Live chat widget for customer support on your storefront."
					connected={!!crispWebsiteId}
					onSave={() => updateSettings([
						{ key: "crisp_website_id", value: crispWebsiteId, group: "integrations" },
					])}
				>
					<div className="space-y-2">
						<Label>Website ID</Label>
						<Input
							value={crispWebsiteId}
							onChange={(e) => setCrispWebsiteId(e.target.value)}
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						/>
						<p className="text-xs text-muted-foreground">
							From Crisp Dashboard → Settings → Website Settings → Setup.
						</p>
					</div>
				</IntegrationCard>
			</div>
		</div>
	)
}
