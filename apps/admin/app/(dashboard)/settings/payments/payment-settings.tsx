"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSettings } from "../actions"

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

export function PaymentSettings({ settings }: { settings: Setting[] }) {
	// Payment methods
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
				<p className="text-muted-foreground text-sm"><span className="sm:hidden">Methods & checkout.</span><span className="hidden sm:inline">Configure payment methods, currencies, and checkout behavior.</span></p>
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save All"}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Payment Methods</CardTitle>
					<CardDescription>Enable or disable payment options at checkout.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Credit & Debit Cards</Label>
							<p className="text-xs text-muted-foreground">Visa, Mastercard, Amex via Polar</p>
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
								<SelectItem value="redirect">Redirect (hosted by Polar)</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Embedded keeps customers on your site. Redirect uses Polar's hosted checkout page.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
