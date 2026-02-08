"use server"

import { db } from "@quickdash/db/client"
import { desc, eq, sql, gte, lte, and } from "@quickdash/db/drizzle"
import { orders, products, subscriptions, crmContacts, users, categories } from "@quickdash/db/schema"
import * as XLSX from "xlsx"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireExportPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to export data")
	}
	return workspace
}

type ExportFormat = "csv" | "xlsx"

interface DateRange {
	from: Date
	to: Date
}

// Helper to format date for filenames
function formatDateForFilename(date: Date): string {
	return date.toISOString().split("T")[0]
}

// Convert data to CSV
function toCSV(data: Record<string, unknown>[], columns: string[]): string {
	const header = columns.join(",")
	const rows = data.map((row) =>
		columns
			.map((col) => {
				const val = row[col]
				if (val === null || val === undefined) return ""
				const str = String(val)
				// Escape quotes and wrap in quotes if contains comma, quote, or newline
				if (str.includes(",") || str.includes('"') || str.includes("\n")) {
					return `"${str.replace(/"/g, '""')}"`
				}
				return str
			})
			.join(",")
	)
	return [header, ...rows].join("\n")
}

// Convert data to XLSX buffer
function toXLSX(data: Record<string, unknown>[], sheetName: string): Buffer {
	const worksheet = XLSX.utils.json_to_sheet(data)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
	return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }))
}

// Export orders (revenue data)
export async function exportOrders(
	format: ExportFormat,
	dateRange?: DateRange
): Promise<{ data: string; filename: string; mimeType: string }> {
	const workspace = await requireExportPermission()

	const conditions = [eq(orders.workspaceId, workspace.id)]
	if (dateRange) {
		conditions.push(gte(orders.createdAt, dateRange.from))
		conditions.push(lte(orders.createdAt, dateRange.to))
	}

	const data = await db
		.select({
			orderNumber: orders.orderNumber,
			status: orders.status,
			customerEmail: users.email,
			customerName: users.name,
			subtotal: orders.subtotal,
			taxAmount: orders.taxAmount,
			shippingAmount: orders.shippingAmount,
			discountAmount: orders.discountAmount,
			total: orders.total,
			trackingNumber: orders.trackingNumber,
			createdAt: orders.createdAt,
			shippedAt: orders.shippedAt,
			deliveredAt: orders.deliveredAt,
		})
		.from(orders)
		.leftJoin(users, eq(orders.userId, users.id))
		.where(and(...conditions))
		.orderBy(desc(orders.createdAt))

	// Format dates and numbers for export
	const formatted = data.map((row) => ({
		orderNumber: row.orderNumber,
		status: row.status,
		customerEmail: row.customerEmail || "",
		customerName: row.customerName || "",
		subtotal: Number(row.subtotal || 0).toFixed(2),
		taxAmount: Number(row.taxAmount || 0).toFixed(2),
		shippingAmount: Number(row.shippingAmount || 0).toFixed(2),
		discountAmount: Number(row.discountAmount || 0).toFixed(2),
		total: Number(row.total || 0).toFixed(2),
		trackingNumber: row.trackingNumber || "",
		createdAt: row.createdAt?.toISOString() || "",
		shippedAt: row.shippedAt?.toISOString() || "",
		deliveredAt: row.deliveredAt?.toISOString() || "",
	}))

	const columns = [
		"orderNumber",
		"status",
		"customerEmail",
		"customerName",
		"subtotal",
		"taxAmount",
		"shippingAmount",
		"discountAmount",
		"total",
		"trackingNumber",
		"createdAt",
		"shippedAt",
		"deliveredAt",
	]

	const dateSuffix = dateRange
		? `_${formatDateForFilename(dateRange.from)}_to_${formatDateForFilename(dateRange.to)}`
		: `_${formatDateForFilename(new Date())}`

	if (format === "xlsx") {
		const buffer = toXLSX(formatted, "Orders")
		return {
			data: buffer.toString("base64"),
			filename: `orders${dateSuffix}.xlsx`,
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}
	}

	return {
		data: toCSV(formatted, columns),
		filename: `orders${dateSuffix}.csv`,
		mimeType: "text/csv",
	}
}

// Export customers (from CRM contacts)
export async function exportCustomers(
	format: ExportFormat
): Promise<{ data: string; filename: string; mimeType: string }> {
	const workspace = await requireExportPermission()

	const data = await db
		.select({
			email: crmContacts.email,
			firstName: crmContacts.firstName,
			lastName: crmContacts.lastName,
			phone: crmContacts.phone,
			mobile: crmContacts.mobile,
			jobTitle: crmContacts.jobTitle,
			status: crmContacts.status,
			source: crmContacts.source,
			city: crmContacts.city,
			state: crmContacts.state,
			country: crmContacts.country,
			lastContactedAt: crmContacts.lastContactedAt,
			createdAt: crmContacts.createdAt,
		})
		.from(crmContacts)
		.where(eq(crmContacts.workspaceId, workspace.id))
		.orderBy(desc(crmContacts.createdAt))

	const formatted = data.map((row) => ({
		email: row.email || "",
		name: `${row.firstName} ${row.lastName}`.trim(),
		phone: row.phone || row.mobile || "",
		jobTitle: row.jobTitle || "",
		status: row.status || "",
		source: row.source || "",
		location: [row.city, row.state, row.country].filter(Boolean).join(", "),
		lastContactedAt: row.lastContactedAt?.toISOString() || "",
		createdAt: row.createdAt?.toISOString() || "",
	}))

	const columns = ["email", "name", "phone", "jobTitle", "status", "source", "location", "lastContactedAt", "createdAt"]
	const filename = `contacts_${formatDateForFilename(new Date())}`

	if (format === "xlsx") {
		const buffer = toXLSX(formatted, "Contacts")
		return {
			data: buffer.toString("base64"),
			filename: `${filename}.xlsx`,
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}
	}

	return {
		data: toCSV(formatted, columns),
		filename: `${filename}.csv`,
		mimeType: "text/csv",
	}
}

// Export products/inventory
export async function exportProducts(
	format: ExportFormat
): Promise<{ data: string; filename: string; mimeType: string }> {
	const workspace = await requireExportPermission()

	const data = await db
		.select({
			name: products.name,
			slug: products.slug,
			category: categories.name,
			price: products.price,
			compareAtPrice: products.compareAtPrice,
			costPrice: products.costPrice,
			isActive: products.isActive,
			isFeatured: products.isFeatured,
			isSubscribable: products.isSubscribable,
			createdAt: products.createdAt,
		})
		.from(products)
		.leftJoin(categories, eq(products.categoryId, categories.id))
		.where(eq(products.workspaceId, workspace.id))
		.orderBy(products.name)

	const formatted = data.map((row) => ({
		name: row.name,
		slug: row.slug,
		category: row.category || "",
		price: Number(row.price || 0).toFixed(2),
		compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice).toFixed(2) : "",
		costPrice: row.costPrice ? Number(row.costPrice).toFixed(2) : "",
		status: row.isActive ? "active" : "inactive",
		isFeatured: row.isFeatured ? "yes" : "no",
		isSubscribable: row.isSubscribable ? "yes" : "no",
		createdAt: row.createdAt?.toISOString() || "",
	}))

	const columns = [
		"name",
		"slug",
		"category",
		"price",
		"compareAtPrice",
		"costPrice",
		"status",
		"isFeatured",
		"isSubscribable",
		"createdAt",
	]
	const filename = `products_${formatDateForFilename(new Date())}`

	if (format === "xlsx") {
		const buffer = toXLSX(formatted, "Products")
		return {
			data: buffer.toString("base64"),
			filename: `${filename}.xlsx`,
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}
	}

	return {
		data: toCSV(formatted, columns),
		filename: `${filename}.csv`,
		mimeType: "text/csv",
	}
}

// Export subscriptions
export async function exportSubscriptions(
	format: ExportFormat
): Promise<{ data: string; filename: string; mimeType: string }> {
	const workspace = await requireExportPermission()

	const data = await db
		.select({
			customerEmail: users.email,
			customerName: users.name,
			status: subscriptions.status,
			frequency: subscriptions.frequency,
			pricePerDelivery: subscriptions.pricePerDelivery,
			totalDeliveries: subscriptions.totalDeliveries,
			nextDeliveryAt: subscriptions.nextDeliveryAt,
			lastDeliveryAt: subscriptions.lastDeliveryAt,
			cancelledAt: subscriptions.cancelledAt,
			cancellationReason: subscriptions.cancellationReason,
			createdAt: subscriptions.createdAt,
		})
		.from(subscriptions)
		.leftJoin(users, eq(subscriptions.userId, users.id))
		.where(eq(subscriptions.workspaceId, workspace.id))
		.orderBy(desc(subscriptions.createdAt))

	const formatted = data.map((row) => ({
		customerEmail: row.customerEmail || "",
		customerName: row.customerName || "",
		status: row.status,
		frequency: row.frequency,
		pricePerDelivery: Number(row.pricePerDelivery || 0).toFixed(2),
		totalDeliveries: row.totalDeliveries || 0,
		nextDeliveryAt: row.nextDeliveryAt?.toISOString() || "",
		lastDeliveryAt: row.lastDeliveryAt?.toISOString() || "",
		cancelledAt: row.cancelledAt?.toISOString() || "",
		cancellationReason: row.cancellationReason || "",
		createdAt: row.createdAt?.toISOString() || "",
	}))

	const columns = [
		"customerEmail",
		"customerName",
		"status",
		"frequency",
		"pricePerDelivery",
		"totalDeliveries",
		"nextDeliveryAt",
		"lastDeliveryAt",
		"cancelledAt",
		"cancellationReason",
		"createdAt",
	]
	const filename = `subscriptions_${formatDateForFilename(new Date())}`

	if (format === "xlsx") {
		const buffer = toXLSX(formatted, "Subscriptions")
		return {
			data: buffer.toString("base64"),
			filename: `${filename}.xlsx`,
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}
	}

	return {
		data: toCSV(formatted, columns),
		filename: `${filename}.csv`,
		mimeType: "text/csv",
	}
}

// Export financial summary (for tax purposes)
export async function exportFinancialSummary(
	format: ExportFormat,
	year: number
): Promise<{ data: string; filename: string; mimeType: string }> {
	const workspace = await requireExportPermission()

	const startDate = new Date(year, 0, 1)
	const endDate = new Date(year, 11, 31, 23, 59, 59)

	// Get monthly breakdown
	const monthlyData = await db
		.select({
			month: sql<number>`EXTRACT(MONTH FROM ${orders.createdAt})`,
			orderCount: sql<number>`COUNT(*)`,
			grossRevenue: sql<number>`SUM(${orders.total})`,
			subtotalRevenue: sql<number>`SUM(${orders.subtotal})`,
			totalTax: sql<number>`SUM(${orders.taxAmount})`,
			totalShipping: sql<number>`SUM(${orders.shippingAmount})`,
			totalDiscounts: sql<number>`SUM(${orders.discountAmount})`,
		})
		.from(orders)
		.where(
			and(
				eq(orders.workspaceId, workspace.id),
				gte(orders.createdAt, startDate),
				lte(orders.createdAt, endDate)
			)
		)
		.groupBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`)
		.orderBy(sql`EXTRACT(MONTH FROM ${orders.createdAt})`)

	const monthNames = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	]

	// Fill in all months (even if no orders)
	const formatted = monthNames.map((monthName, idx) => {
		const monthNum = idx + 1
		const monthData = monthlyData.find((d) => Number(d.month) === monthNum)
		return {
			month: monthName,
			orderCount: monthData?.orderCount || 0,
			grossRevenue: Number(monthData?.grossRevenue || 0).toFixed(2),
			subtotalRevenue: Number(monthData?.subtotalRevenue || 0).toFixed(2),
			totalTax: Number(monthData?.totalTax || 0).toFixed(2),
			totalShipping: Number(monthData?.totalShipping || 0).toFixed(2),
			totalDiscounts: Number(monthData?.totalDiscounts || 0).toFixed(2),
		}
	})

	// Add yearly totals row
	const totals = {
		month: `TOTAL ${year}`,
		orderCount: formatted.reduce((sum, m) => sum + Number(m.orderCount), 0),
		grossRevenue: formatted.reduce((sum, m) => sum + Number(m.grossRevenue), 0).toFixed(2),
		subtotalRevenue: formatted.reduce((sum, m) => sum + Number(m.subtotalRevenue), 0).toFixed(2),
		totalTax: formatted.reduce((sum, m) => sum + Number(m.totalTax), 0).toFixed(2),
		totalShipping: formatted.reduce((sum, m) => sum + Number(m.totalShipping), 0).toFixed(2),
		totalDiscounts: formatted.reduce((sum, m) => sum + Number(m.totalDiscounts), 0).toFixed(2),
	}
	formatted.push(totals)

	const columns = [
		"month",
		"orderCount",
		"grossRevenue",
		"subtotalRevenue",
		"totalTax",
		"totalShipping",
		"totalDiscounts",
	]

	if (format === "xlsx") {
		const buffer = toXLSX(formatted, `Financial Summary ${year}`)
		return {
			data: buffer.toString("base64"),
			filename: `financial_summary_${year}.xlsx`,
			mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}
	}

	return {
		data: toCSV(formatted, columns),
		filename: `financial_summary_${year}.csv`,
		mimeType: "text/csv",
	}
}

// Get available years for financial reports
export async function getAvailableYears(): Promise<number[]> {
	const workspace = await requireExportPermission()

	const result = await db
		.select({
			year: sql<number>`DISTINCT EXTRACT(YEAR FROM ${orders.createdAt})`,
		})
		.from(orders)
		.where(eq(orders.workspaceId, workspace.id))
		.orderBy(sql`EXTRACT(YEAR FROM ${orders.createdAt}) DESC`)

	const years = result.map((r) => Number(r.year)).filter((y) => !isNaN(y))

	// Always include current year
	const currentYear = new Date().getFullYear()
	if (!years.includes(currentYear)) {
		years.unshift(currentYear)
	}

	return years
}
