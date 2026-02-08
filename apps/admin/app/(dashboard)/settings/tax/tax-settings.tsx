"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { updateSettings } from "../actions"

type Setting = {
	id: string
	key: string
	value: string | null
	group: string
}

type TaxRate = {
	id: string
	region: string
	rate: number
	name: string
}

const defaultCanadianRates: TaxRate[] = [
	{ id: "ca-ab", region: "Alberta", rate: 5, name: "GST" },
	{ id: "ca-bc", region: "British Columbia", rate: 12, name: "GST + PST" },
	{ id: "ca-mb", region: "Manitoba", rate: 12, name: "GST + PST" },
	{ id: "ca-nb", region: "New Brunswick", rate: 15, name: "HST" },
	{ id: "ca-nl", region: "Newfoundland & Labrador", rate: 15, name: "HST" },
	{ id: "ca-ns", region: "Nova Scotia", rate: 15, name: "HST" },
	{ id: "ca-nt", region: "Northwest Territories", rate: 5, name: "GST" },
	{ id: "ca-nu", region: "Nunavut", rate: 5, name: "GST" },
	{ id: "ca-on", region: "Ontario", rate: 13, name: "HST" },
	{ id: "ca-pe", region: "Prince Edward Island", rate: 15, name: "HST" },
	{ id: "ca-qc", region: "Quebec", rate: 14.975, name: "GST + QST" },
	{ id: "ca-sk", region: "Saskatchewan", rate: 11, name: "GST + PST" },
	{ id: "ca-yt", region: "Yukon", rate: 5, name: "GST" },
]

const defaultInternationalRates: TaxRate[] = [
	{ id: "us", region: "United States", rate: 0, name: "Sales Tax (varies by state)" },
	{ id: "mx", region: "Mexico", rate: 16, name: "IVA" },
	{ id: "gb", region: "United Kingdom", rate: 20, name: "VAT" },
	{ id: "au", region: "Australia", rate: 10, name: "GST" },
	{ id: "de", region: "Germany", rate: 19, name: "VAT" },
	{ id: "fr", region: "France", rate: 20, name: "VAT" },
	{ id: "jp", region: "Japan", rate: 10, name: "Consumption Tax" },
	{ id: "nl", region: "Netherlands", rate: 21, name: "VAT" },
]

function getVal(settings: Setting[], key: string): string {
	return settings.find((s) => s.key === key)?.value || ""
}

function getBool(settings: Setting[], key: string): boolean {
	return settings.find((s) => s.key === key)?.value === "true"
}

export function TaxSettings({ settings }: { settings: Setting[] }) {
	const [taxEnabled, setTaxEnabled] = useState(getBool(settings, "tax_enabled"))
	const [pricesIncludeTax, setPricesIncludeTax] = useState(getBool(settings, "prices_include_tax"))
	const [autoCalculate, setAutoCalculate] = useState(getBool(settings, "tax_auto_calculate"))
	const [taxDisclaimer, setTaxDisclaimer] = useState(
		getVal(settings, "tax_disclaimer") || "All prices include applicable taxes."
	)

	const [canadianRates, setCanadianRates] = useState<TaxRate[]>(
		getVal(settings, "tax_rates_ca") ? JSON.parse(getVal(settings, "tax_rates_ca")) : defaultCanadianRates
	)
	const [internationalRates, setInternationalRates] = useState<TaxRate[]>(
		getVal(settings, "tax_rates_intl") ? JSON.parse(getVal(settings, "tax_rates_intl")) : defaultInternationalRates
	)

	const [dutiesEnabled, setDutiesEnabled] = useState(getBool(settings, "duties_buyer_responsible"))
	const [dutiesDisclaimer, setDutiesDisclaimer] = useState(
		getVal(settings, "duties_disclaimer") || "International orders may be subject to import duties and customs fees upon delivery. These charges are the buyer's responsibility and are not included in the product price."
	)

	// Add rate dialogs
	const [addCaOpen, setAddCaOpen] = useState(false)
	const [addIntlOpen, setAddIntlOpen] = useState(false)
	const [newRegion, setNewRegion] = useState("")
	const [newRate, setNewRate] = useState("")
	const [newName, setNewName] = useState("")
	const [saving, setSaving] = useState(false)

	function handleAddRate(type: "ca" | "intl") {
		if (!newRegion || !newRate || !newName) {
			toast.error("All fields are required")
			return
		}
		const rate: TaxRate = {
			id: crypto.randomUUID(),
			region: newRegion,
			rate: Number.parseFloat(newRate),
			name: newName,
		}
		if (type === "ca") {
			setCanadianRates((prev) => [...prev, rate])
			setAddCaOpen(false)
		} else {
			setInternationalRates((prev) => [...prev, rate])
			setAddIntlOpen(false)
		}
		setNewRegion("")
		setNewRate("")
		setNewName("")
	}

	function handleDeleteRate(id: string, type: "ca" | "intl") {
		if (type === "ca") {
			setCanadianRates((prev) => prev.filter((r) => r.id !== id))
		} else {
			setInternationalRates((prev) => prev.filter((r) => r.id !== id))
		}
	}

	async function handleSave() {
		setSaving(true)
		try {
			await updateSettings([
				{ key: "tax_enabled", value: String(taxEnabled), group: "tax" },
				{ key: "prices_include_tax", value: String(pricesIncludeTax), group: "tax" },
				{ key: "tax_auto_calculate", value: String(autoCalculate), group: "tax" },
				{ key: "tax_disclaimer", value: taxDisclaimer, group: "tax" },
				{ key: "tax_rates_ca", value: JSON.stringify(canadianRates), group: "tax" },
				{ key: "tax_rates_intl", value: JSON.stringify(internationalRates), group: "tax" },
				{ key: "duties_buyer_responsible", value: String(dutiesEnabled), group: "tax" },
				{ key: "duties_disclaimer", value: dutiesDisclaimer, group: "tax" },
			])
			toast.success("Tax settings saved")
		} catch {
			toast.error("Failed to save")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm"><span className="sm:hidden">Tax rates & duties.</span><span className="hidden sm:inline">Manage tax rates, collection rules, and import duty disclaimers.</span></p>
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save All"}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Tax Collection</CardTitle>
					<CardDescription>Configure how taxes are applied to orders.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
						<Label>Collect tax on orders</Label>
					</div>
					<div className="flex items-center gap-2">
						<Switch checked={pricesIncludeTax} onCheckedChange={setPricesIncludeTax} />
						<Label>Prices include tax</Label>
					</div>
					<div className="flex items-center gap-2">
						<Switch checked={autoCalculate} onCheckedChange={setAutoCalculate} />
						<Label>Auto-calculate based on customer location</Label>
					</div>
					{pricesIncludeTax && (
						<div className="space-y-2 pt-2 border-t">
							<Label>Tax Disclaimer (shown on product pages & checkout)</Label>
							<Input
								value={taxDisclaimer}
								onChange={(e) => setTaxDisclaimer(e.target.value)}
								placeholder="All prices include applicable taxes."
							/>
							<p className="text-xs text-muted-foreground">
								Required by law in most jurisdictions when displaying tax-inclusive prices.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Canadian Tax Rates</CardTitle>
							<CardDescription>Provincial/territorial tax rates for domestic orders.</CardDescription>
						</div>
						<Dialog open={addCaOpen} onOpenChange={setAddCaOpen}>
							<DialogTrigger asChild>
								<Button size="sm">Add Rate</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add Canadian Tax Rate</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>Province / Territory</Label>
										<Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="Ontario" />
									</div>
									<div className="space-y-2">
										<Label>Tax Name</Label>
										<Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="HST" />
									</div>
									<div className="space-y-2">
										<Label>Rate (%)</Label>
										<Input type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="13" />
									</div>
									<Button onClick={() => handleAddRate("ca")} className="w-full">Add</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					{canadianRates.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">No Canadian tax rates configured.</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Province / Territory</TableHead>
									<TableHead>Tax</TableHead>
									<TableHead>Rate</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{canadianRates.map((rate) => (
									<TableRow key={rate.id}>
										<TableCell className="text-sm">{rate.region}</TableCell>
										<TableCell className="text-sm">{rate.name}</TableCell>
										<TableCell className="text-sm">{rate.rate}%</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive text-xs"
												onClick={() => handleDeleteRate(rate.id, "ca")}
											>
												Remove
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>International Tax Rates</CardTitle>
							<CardDescription>VAT, GST, and sales tax for international markets.</CardDescription>
						</div>
						<Dialog open={addIntlOpen} onOpenChange={setAddIntlOpen}>
							<DialogTrigger asChild>
								<Button size="sm">Add Rate</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add International Tax Rate</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>Country / Region</Label>
										<Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="United Kingdom" />
									</div>
									<div className="space-y-2">
										<Label>Tax Name</Label>
										<Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="VAT" />
									</div>
									<div className="space-y-2">
										<Label>Rate (%)</Label>
										<Input type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="20" />
									</div>
									<Button onClick={() => handleAddRate("intl")} className="w-full">Add</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
							US sales tax is state-specific and triggered by economic nexus ($100K in sales or 200 transactions per state). Use auto-calculate for accurate US rates.
						</p>
						{internationalRates.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">No international tax rates configured.</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Country / Region</TableHead>
										<TableHead>Tax</TableHead>
										<TableHead>Rate</TableHead>
										<TableHead className="w-[80px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{internationalRates.map((rate) => (
										<TableRow key={rate.id}>
											<TableCell className="text-sm">{rate.region}</TableCell>
											<TableCell className="text-sm">{rate.name}</TableCell>
											<TableCell className="text-sm">{rate.rate === 0 ? "Varies" : `${rate.rate}%`}</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive text-xs"
													onClick={() => handleDeleteRate(rate.id, "intl")}
												>
													Remove
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Import Duties & Customs</CardTitle>
					<CardDescription>Configure disclaimers for international shipping duties.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						<Switch checked={dutiesEnabled} onCheckedChange={setDutiesEnabled} />
						<Label>Show duties disclaimer at checkout</Label>
					</div>
					{dutiesEnabled && (
						<div className="space-y-2">
							<Label>Duties Disclaimer</Label>
							<textarea
								className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								value={dutiesDisclaimer}
								onChange={(e) => setDutiesDisclaimer(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Displayed at checkout for international orders. Import duties and customs fees are determined by the destination country and are typically collected upon delivery.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
