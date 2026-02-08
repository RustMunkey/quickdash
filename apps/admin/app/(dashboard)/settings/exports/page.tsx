"use client"

import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PrinterIcon, Download04Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
	exportOrders,
	exportCustomers,
	exportProducts,
	exportSubscriptions,
	exportFinancialSummary,
	getAvailableYears,
} from "./actions"

type ExportFormat = "csv" | "xlsx"

function downloadFile(data: string, filename: string, mimeType: string, isBase64 = false) {
	const blob = isBase64
		? new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: mimeType })
		: new Blob([data], { type: mimeType })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)
}

function openPrintWindow(title: string, csvData: string) {
	const rows = csvData.split("\n").map((row) => {
		const cells: string[] = []
		let current = ""
		let inQuotes = false
		for (const char of row) {
			if (char === '"') {
				inQuotes = !inQuotes
			} else if (char === "," && !inQuotes) {
				cells.push(current)
				current = ""
			} else {
				current += char
			}
		}
		cells.push(current)
		return cells
	})

	const headers = rows[0] || []
	const body = rows.slice(1).filter((r) => r.some((c) => c.trim()))

	const headerCells = headers.map((h) => `<th>${h}</th>`).join("")
	const bodyRows = body
		.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`)
		.join("")

	const html = `<!DOCTYPE html>
<html>
<head>
<title>${title} - Quickdash Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; color: #18181b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #71717a; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f4f4f5; text-align: left; padding: 6px 8px; border: 1px solid #e4e4e7; font-weight: 600; white-space: nowrap; }
  td { padding: 5px 8px; border: 1px solid #e4e4e7; }
  tr:nth-child(even) { background: #fafafa; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p class="meta">Exported ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} &middot; ${body.length} records</p>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body>
</html>`

	const win = window.open("", "_blank")
	if (win) {
		win.document.write(html)
		win.document.close()
		setTimeout(() => win.print(), 300)
	}
}

export default function ExportsPage() {
	const [format, setFormat] = useState<ExportFormat>("xlsx")
	const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
	const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()])
	const [loading, setLoading] = useState<string | null>(null)

	useEffect(() => {
		getAvailableYears().then(setAvailableYears).catch(console.error)
	}, [])

	async function handleExport(
		exportFn: () => Promise<{ data: string; filename: string; mimeType: string }>,
		name: string
	) {
		setLoading(name)
		try {
			const result = await exportFn()
			const isBase64 = result.mimeType.includes("spreadsheet")
			downloadFile(result.data, result.filename, result.mimeType, isBase64)
			toast.success(`${name} exported`)
		} catch (err) {
			console.error(err)
			toast.error(`Failed to export ${name.toLowerCase()}`)
		} finally {
			setLoading(null)
		}
	}

	async function handlePrint(
		exportFn: () => Promise<{ data: string; filename: string; mimeType: string }>,
		title: string
	) {
		setLoading(`print-${title}`)
		try {
			// Always fetch CSV for printing (clean tabular data)
			const result = await exportFn()
			openPrintWindow(title, result.data)
		} catch (err) {
			console.error(err)
			toast.error(`Failed to print ${title.toLowerCase()}`)
		} finally {
			setLoading(null)
		}
	}

	async function handleExportAll() {
		setLoading("export-all")
		try {
			const exports = [
				{ fn: () => exportOrders(format), name: "Orders" },
				{ fn: () => exportCustomers(format), name: "Customers" },
				{ fn: () => exportProducts(format), name: "Products" },
				{ fn: () => exportSubscriptions(format), name: "Subscriptions" },
			]
			for (const exp of exports) {
				const result = await exp.fn()
				const isBase64 = result.mimeType.includes("spreadsheet")
				downloadFile(result.data, result.filename, result.mimeType, isBase64)
			}
			toast.success("All data exported")
		} catch (err) {
			console.error(err)
			toast.error("Failed to export all data")
		} finally {
			setLoading(null)
		}
	}

	async function handlePrintAll() {
		setLoading("print-all")
		try {
			const exports = [
				{ fn: () => exportOrders("csv"), title: "Orders" },
				{ fn: () => exportCustomers("csv"), title: "Customers" },
				{ fn: () => exportProducts("csv"), title: "Products" },
				{ fn: () => exportSubscriptions("csv"), title: "Subscriptions" },
			]
			// Combine all CSVs into one print view
			const sections: string[] = []
			for (const exp of exports) {
				const result = await exp.fn()
				const rows = result.data.split("\n").map((row) => {
					const cells: string[] = []
					let current = ""
					let inQuotes = false
					for (const char of row) {
						if (char === '"') { inQuotes = !inQuotes }
						else if (char === "," && !inQuotes) { cells.push(current); current = "" }
						else { current += char }
					}
					cells.push(current)
					return cells
				})
				const headers = rows[0] || []
				const body = rows.slice(1).filter((r) => r.some((c) => c.trim()))
				const headerCells = headers.map((h) => `<th>${h}</th>`).join("")
				const bodyRows = body.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")
				sections.push(`<h2 style="font-size:16px;margin:24px 0 8px;">${exp.title} (${body.length})</h2><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`)
			}
			const html = `<!DOCTYPE html>
<html><head><title>All Data - Quickdash Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; color: #18181b; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #71717a; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  th { background: #f4f4f5; text-align: left; padding: 6px 8px; border: 1px solid #e4e4e7; font-weight: 600; white-space: nowrap; }
  td { padding: 5px 8px; border: 1px solid #e4e4e7; }
  tr:nth-child(even) { background: #fafafa; }
  h2 { page-break-before: auto; }
  @media print { body { margin: 12px; } }
</style></head><body>
<h1>All Data Export</h1>
<p class="meta">Exported ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
${sections.join("")}
</body></html>`
			const win = window.open("", "_blank")
			if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 300) }
			toast.success("Print view opened")
		} catch (err) {
			console.error(err)
			toast.error("Failed to prepare print view")
		} finally {
			setLoading(null)
		}
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Download or print your business data for accounting, tax filing, or backup.
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handlePrintAll}
						disabled={loading !== null}
					>
						<HugeiconsIcon icon={PrinterIcon} size={16} className="mr-2" />
						{loading === "print-all" ? "Preparing..." : "Print All"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportAll}
						disabled={loading !== null}
					>
						<HugeiconsIcon icon={Download04Icon} size={16} className="mr-2" />
						{loading === "export-all" ? "Exporting..." : "Export All"}
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<Label htmlFor="format">Format</Label>
					<Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
						<SelectTrigger id="format" className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
							<SelectItem value="csv">CSV (.csv)</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<p className="text-xs text-muted-foreground">
					Excel files work with Microsoft Excel, Apple Numbers, and Google Sheets
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Orders</CardTitle>
						<CardDescription>
							All orders with revenue, tax, shipping, and status information
						</CardDescription>
					</CardHeader>
					<CardContent className="flex gap-2">
						<Button
							onClick={() => handleExport(() => exportOrders(format), "Orders")}
							disabled={loading !== null}
							className="flex-1"
						>
							{loading === "Orders" ? "Exporting..." : "Export"}
						</Button>
						<Button
							variant="outline"
							onClick={() => handlePrint(() => exportOrders("csv"), "Orders")}
							disabled={loading !== null}
						>
							<HugeiconsIcon icon={PrinterIcon} size={14} />
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Customers</CardTitle>
						<CardDescription>
							Customer list with contact info and purchase history
						</CardDescription>
					</CardHeader>
					<CardContent className="flex gap-2">
						<Button
							onClick={() => handleExport(() => exportCustomers(format), "Customers")}
							disabled={loading !== null}
							className="flex-1"
						>
							{loading === "Customers" ? "Exporting..." : "Export"}
						</Button>
						<Button
							variant="outline"
							onClick={() => handlePrint(() => exportCustomers("csv"), "Customers")}
							disabled={loading !== null}
						>
							<HugeiconsIcon icon={PrinterIcon} size={14} />
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Products</CardTitle>
						<CardDescription>
							Product catalog with pricing, inventory, and cost data
						</CardDescription>
					</CardHeader>
					<CardContent className="flex gap-2">
						<Button
							onClick={() => handleExport(() => exportProducts(format), "Products")}
							disabled={loading !== null}
							className="flex-1"
						>
							{loading === "Products" ? "Exporting..." : "Export"}
						</Button>
						<Button
							variant="outline"
							onClick={() => handlePrint(() => exportProducts("csv"), "Products")}
							disabled={loading !== null}
						>
							<HugeiconsIcon icon={PrinterIcon} size={14} />
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Subscriptions</CardTitle>
						<CardDescription>
							Active and canceled subscriptions with billing details
						</CardDescription>
					</CardHeader>
					<CardContent className="flex gap-2">
						<Button
							onClick={() => handleExport(() => exportSubscriptions(format), "Subscriptions")}
							disabled={loading !== null}
							className="flex-1"
						>
							{loading === "Subscriptions" ? "Exporting..." : "Export"}
						</Button>
						<Button
							variant="outline"
							onClick={() => handlePrint(() => exportSubscriptions("csv"), "Subscriptions")}
							disabled={loading !== null}
						>
							<HugeiconsIcon icon={PrinterIcon} size={14} />
						</Button>
					</CardContent>
				</Card>
			</div>

			<Separator />

			<div>
				<h2 className="text-lg font-semibold mb-4">Financial Reports</h2>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Annual Financial Summary</CardTitle>
						<CardDescription>
							Monthly breakdown of revenue, tax collected, shipping, and discounts for tax filing
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
						<div className="flex items-center gap-2">
							<Label htmlFor="year">Year</Label>
							<Select
								value={String(selectedYear)}
								onValueChange={(v) => setSelectedYear(Number(v))}
							>
								<SelectTrigger id="year" className="w-24">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableYears.map((year) => (
										<SelectItem key={year} value={String(year)}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex gap-2">
							<Button
								onClick={() =>
									handleExport(
										() => exportFinancialSummary(format, selectedYear),
										"Financial Summary"
									)
								}
								disabled={loading !== null}
							>
								{loading === "Financial Summary" ? "Exporting..." : "Export"}
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									handlePrint(
										() => exportFinancialSummary("csv", selectedYear),
										`Financial Summary ${selectedYear}`
									)
								}
								disabled={loading !== null}
							>
								<HugeiconsIcon icon={PrinterIcon} size={14} className="mr-2" />
								Print
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				<p className="font-medium text-foreground mb-1">About your data</p>
				<ul className="list-disc list-inside space-y-1">
					<li>Business-critical data (orders, customers, products) is stored permanently</li>
					<li>Exports include all historical data unless filtered by date</li>
					<li>For tax purposes, keep annual financial summaries with your records</li>
					<li>CSV files are universal; XLSX works with Excel, Numbers, and Google Sheets</li>
				</ul>
			</div>
		</div>
	)
}
