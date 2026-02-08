"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

const countries = [
	{ code: "US", name: "United States" },
	{ code: "CA", name: "Canada" },
	{ code: "GB", name: "United Kingdom" },
	{ code: "AU", name: "Australia" },
	{ code: "DE", name: "Germany" },
	{ code: "FR", name: "France" },
	{ code: "MX", name: "Mexico" },
	{ code: "JP", name: "Japan" },
	{ code: "NL", name: "Netherlands" },
	{ code: "IT", name: "Italy" },
	{ code: "ES", name: "Spain" },
	{ code: "BR", name: "Brazil" },
]

const weightUnits = [
	{ code: "ct", name: "Carats (ct)" },
	{ code: "lb", name: "Pounds (lb)" },
	{ code: "kg", name: "Kilograms (kg)" },
	{ code: "oz", name: "Ounces (oz)" },
	{ code: "g", name: "Grams (g)" },
]

const dimensionUnits = [
	{ code: "in", name: "Inches (in)" },
	{ code: "cm", name: "Centimeters (cm)" },
]

export function ShippingSettings({ settings }: { settings: Setting[] }) {
	// Ship-from address
	const [companyName, setCompanyName] = useState(getVal(settings, "ship_from_company"))
	const [name, setName] = useState(getVal(settings, "ship_from_name"))
	const [street1, setStreet1] = useState(getVal(settings, "ship_from_street1"))
	const [street2, setStreet2] = useState(getVal(settings, "ship_from_street2"))
	const [city, setCity] = useState(getVal(settings, "ship_from_city"))
	const [state, setState] = useState(getVal(settings, "ship_from_state"))
	const [zip, setZip] = useState(getVal(settings, "ship_from_zip"))
	const [country, setCountry] = useState(getVal(settings, "ship_from_country") || "US")
	const [phone, setPhone] = useState(getVal(settings, "ship_from_phone"))
	const [email, setEmail] = useState(getVal(settings, "ship_from_email"))

	// Shipping preferences
	const [weightUnit, setWeightUnit] = useState(getVal(settings, "ship_weight_unit") || "lb")
	const [dimensionUnit, setDimensionUnit] = useState(getVal(settings, "ship_dimension_unit") || "in")
	const [defaultWeight, setDefaultWeight] = useState(getVal(settings, "ship_default_weight") || "1")
	const [requireSignature, setRequireSignature] = useState(getBool(settings, "ship_require_signature"))
	const [insuranceEnabled, setInsuranceEnabled] = useState(getBool(settings, "ship_insurance_enabled"))
	const [insuranceThreshold, setInsuranceThreshold] = useState(getVal(settings, "ship_insurance_threshold") || "100")

	// Label preferences
	const [labelFormat, setLabelFormat] = useState(getVal(settings, "ship_label_format") || "PDF")
	const [labelSize, setLabelSize] = useState(getVal(settings, "ship_label_size") || "4x6")

	const [saving, setSaving] = useState(false)

	async function handleSave() {
		setSaving(true)
		try {
			await updateSettings([
				// Ship-from address
				{ key: "ship_from_company", value: companyName, group: "shipping" },
				{ key: "ship_from_name", value: name, group: "shipping" },
				{ key: "ship_from_street1", value: street1, group: "shipping" },
				{ key: "ship_from_street2", value: street2, group: "shipping" },
				{ key: "ship_from_city", value: city, group: "shipping" },
				{ key: "ship_from_state", value: state, group: "shipping" },
				{ key: "ship_from_zip", value: zip, group: "shipping" },
				{ key: "ship_from_country", value: country, group: "shipping" },
				{ key: "ship_from_phone", value: phone, group: "shipping" },
				{ key: "ship_from_email", value: email, group: "shipping" },
				// Preferences
				{ key: "ship_weight_unit", value: weightUnit, group: "shipping" },
				{ key: "ship_dimension_unit", value: dimensionUnit, group: "shipping" },
				{ key: "ship_default_weight", value: defaultWeight, group: "shipping" },
				{ key: "ship_require_signature", value: String(requireSignature), group: "shipping" },
				{ key: "ship_insurance_enabled", value: String(insuranceEnabled), group: "shipping" },
				{ key: "ship_insurance_threshold", value: insuranceThreshold, group: "shipping" },
				// Label preferences
				{ key: "ship_label_format", value: labelFormat, group: "shipping" },
				{ key: "ship_label_size", value: labelSize, group: "shipping" },
			])
			toast.success("Shipping settings saved")
		} catch {
			toast.error("Failed to save")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<p className="text-muted-foreground text-sm">
					<span className="sm:hidden">Ship-from address & labels.</span>
					<span className="hidden sm:inline">Configure your warehouse address, label preferences, and shipping options.</span>
				</p>
				<Button size="sm" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save All"}
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Ship-From Address</CardTitle>
					<CardDescription>This address will appear as the sender on all shipping labels.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Company Name</Label>
							<Input
								value={companyName}
								onChange={(e) => setCompanyName(e.target.value)}
								placeholder="Your Company Inc."
							/>
						</div>
						<div className="space-y-2">
							<Label>Contact Name</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="John Smith"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Street Address</Label>
						<Input
							value={street1}
							onChange={(e) => setStreet1(e.target.value)}
							placeholder="123 Warehouse Way"
						/>
					</div>

					<div className="space-y-2">
						<Label>Address Line 2 (Optional)</Label>
						<Input
							value={street2}
							onChange={(e) => setStreet2(e.target.value)}
							placeholder="Suite 100, Building A"
						/>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="space-y-2 col-span-2 sm:col-span-1">
							<Label>City</Label>
							<Input
								value={city}
								onChange={(e) => setCity(e.target.value)}
								placeholder="Los Angeles"
							/>
						</div>
						<div className="space-y-2">
							<Label>State / Province</Label>
							<Input
								value={state}
								onChange={(e) => setState(e.target.value)}
								placeholder="CA"
							/>
						</div>
						<div className="space-y-2">
							<Label>ZIP / Postal Code</Label>
							<Input
								value={zip}
								onChange={(e) => setZip(e.target.value)}
								placeholder="90001"
							/>
						</div>
						<div className="space-y-2 col-span-2 sm:col-span-1">
							<Label>Country</Label>
							<Select value={country} onValueChange={setCountry}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{countries.map((c) => (
										<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Phone Number</Label>
							<Input
								type="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+1 (555) 123-4567"
							/>
							<p className="text-xs text-muted-foreground">Required by most carriers</p>
						</div>
						<div className="space-y-2">
							<Label>Email Address</Label>
							<Input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="shipping@yourcompany.com"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Units & Defaults</CardTitle>
					<CardDescription>Set measurement units and default package values.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Weight Unit</Label>
							<Select value={weightUnit} onValueChange={setWeightUnit}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{weightUnits.map((u) => (
										<SelectItem key={u.code} value={u.code}>{u.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Dimension Unit</Label>
							<Select value={dimensionUnit} onValueChange={setDimensionUnit}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{dimensionUnits.map((u) => (
										<SelectItem key={u.code} value={u.code}>{u.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Default Package Weight</Label>
							<Input
								type="number"
								step="0.1"
								value={defaultWeight}
								onChange={(e) => setDefaultWeight(e.target.value)}
								placeholder="1"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Shipping Options</CardTitle>
					<CardDescription>Configure signature and insurance requirements.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Require Signature</Label>
							<p className="text-xs text-muted-foreground">Require signature confirmation on all shipments</p>
						</div>
						<Switch checked={requireSignature} onCheckedChange={setRequireSignature} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Shipping Insurance</Label>
							<p className="text-xs text-muted-foreground">Automatically insure shipments above threshold</p>
						</div>
						<Switch checked={insuranceEnabled} onCheckedChange={setInsuranceEnabled} />
					</div>
					{insuranceEnabled && (
						<div className="space-y-2 pl-4 border-l-2 border-muted">
							<Label>Insurance Threshold ($)</Label>
							<Input
								type="number"
								step="1"
								value={insuranceThreshold}
								onChange={(e) => setInsuranceThreshold(e.target.value)}
								placeholder="100"
								className="w-full sm:w-[200px]"
							/>
							<p className="text-xs text-muted-foreground">
								Orders above this value will be automatically insured
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Label Preferences</CardTitle>
					<CardDescription>Configure shipping label format and size.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Label Format</Label>
							<Select value={labelFormat} onValueChange={setLabelFormat}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="PDF">PDF</SelectItem>
									<SelectItem value="PNG">PNG</SelectItem>
									<SelectItem value="ZPL">ZPL (Thermal Printer)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Label Size</Label>
							<Select value={labelSize} onValueChange={setLabelSize}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="4x6">4" x 6" (Standard)</SelectItem>
									<SelectItem value="4x8">4" x 8"</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
