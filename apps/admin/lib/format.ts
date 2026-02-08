export function formatCurrency(amount: number | string | null | undefined): string {
	const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0)
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(num)
}

export function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "—"
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

export function formatDateTime(date: Date | string | null | undefined): string {
	if (!date) return "—"
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

export function formatRelativeTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	const now = new Date()
	const diff = now.getTime() - d.getTime()
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (days > 7) return formatDate(d)
	if (days > 0) return `${days}d ago`
	if (hours > 0) return `${hours}h ago`
	if (minutes > 0) return `${minutes}m ago`
	return "Just now"
}

export function truncate(str: string, length: number): string {
	if (str.length <= length) return str
	return str.slice(0, length) + "..."
}

export function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}
