"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"

interface RecentPage {
	path: string
	title: string
	visitedAt: number
}

const STORAGE_KEY = "quickdash-recent-pages"
const MAX_RECENT = 5

// Map paths to readable titles (matching sidebar sub-item labels exactly)
const PATH_TITLES: Record<string, string> = {
	// Overview
	"/": "Dashboard",
	"/analytics": "Overview",
	"/analytics/sales": "Sales Reports",
	"/analytics/subscriptions": "Subscriptions",
	"/analytics/traffic": "Traffic",
	"/analytics/customers": "Customer Insights",
	// Store
	"/orders": "All Orders",
	"/orders/returns": "Returns & Refunds",
	"/orders/fulfillment": "Fulfillment",
	"/products": "All Products",
	"/products/categories": "Categories",
	"/products/variants": "Variants",
	"/reviews": "All Reviews",
	"/reviews/pending": "Pending",
	"/reviews/reported": "Reported",
	"/auctions": "Active Auctions",
	"/auctions/drafts": "Drafts",
	"/auctions/closed": "Closed",
	"/customers": "All Customers",
	"/customers/segments": "Segments",
	"/customers/loyalty": "Loyalty & Rewards",
	"/customers/gift-cards": "Gift Cards",
	// Sales
	"/sales": "CRM",
	"/sales/contacts": "Contacts",
	"/sales/companies": "Companies",
	"/sales/deals": "Deals",
	"/sales/pipeline": "Pipeline",
	"/sales/tasks": "Tasks",
	"/sales/calls": "Sales Calls",
	// Operations
	"/inventory": "Stock Levels",
	"/inventory/alerts": "Inventory Alerts",
	"/inventory/activity": "Inventory Activity",
	"/subscriptions": "Active Subscriptions",
	"/subscriptions/paused": "Paused",
	"/subscriptions/canceled": "Canceled",
	"/subscriptions/dunning": "Dunning",
	"/shipping": "Carriers & Rates",
	"/shipping/zones": "Zones",
	"/shipping/labels": "Labels",
	"/shipping/tracking": "Tracking",
	"/shipping/tracking/pending": "Pending Review",
	"/suppliers": "All Suppliers",
	"/suppliers/purchase-orders": "Purchase Orders",
	"/automation": "Workflows",
	"/automation/triggers": "Triggers",
	"/automation/history": "History",
	// Growth
	"/marketing": "Discounts & Coupons",
	"/marketing/campaigns": "Campaigns",
	"/marketing/referrals": "Referrals",
	"/marketing/seo": "SEO",
	"/content": "Blog Posts",
	"/content/pages": "Pages",
	"/content/media": "Media Library",
	// Billing
	"/billing": "Billing Overview",
	"/billing/invoices": "Invoices",
	"/billing/payment-methods": "Payment Methods",
	"/billing/usage": "Usage",
	// System
	"/notifications": "Email Templates",
	"/messages": "Messages",
	"/notifications/alerts": "Alerts",
	"/calls": "Calls",
	"/activity-log": "Activity Log",
	"/settings": "All Settings",
	"/settings/account": "Account",
	"/settings/notifications": "Notification Settings",
	"/settings/team": "Team & Permissions",
	"/settings/sessions": "Sessions",
	"/settings/storefronts": "Storefronts",
	"/settings/payments": "Payments",
	"/settings/tax": "Tax",
	"/settings/exports": "Exports",
	"/settings/integrations": "Integrations",
	// Developers
	"/developers": "Developer Tools",
	"/developers/api-keys": "API Keys",
	"/developers/webhooks": "Webhook Events",
	"/developers/notes": "Notes & Bugs",
}

function getPageTitle(path: string): string {
	// Check exact match first
	if (PATH_TITLES[path]) {
		return PATH_TITLES[path]
	}

	// Check for dynamic routes like /orders/[id]
	const segments = path.split("/").filter(Boolean)
	if (segments.length >= 2) {
		const basePath = `/${segments[0]}`
		const baseTitle = PATH_TITLES[basePath]
		if (baseTitle) {
			// Return something like "Order Details" for /orders/123
			return `${baseTitle.replace(/s$/, "")} Details`
		}
	}

	// Fallback: capitalize the last segment
	const lastSegment = segments[segments.length - 1] || "Page"
	return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ")
}

export function useRecentPages() {
	const pathname = usePathname()
	const [recentPages, setRecentPages] = useState<RecentPage[]>([])

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				setRecentPages(JSON.parse(stored))
			}
		} catch (e) {
			console.error("Failed to load recent pages:", e)
		}
	}, [])

	// Track current page visit
	useEffect(() => {
		if (!pathname) return

		// Don't track certain paths
		if (pathname.startsWith("/api/") || pathname.startsWith("/login") || pathname.startsWith("/register")) {
			return
		}

		const title = getPageTitle(pathname)
		const newPage: RecentPage = {
			path: pathname,
			title,
			visitedAt: Date.now(),
		}

		setRecentPages((prev) => {
			// Remove existing entry for this path
			const filtered = prev.filter((p) => p.path !== pathname)
			// Add new entry at the beginning
			const updated = [newPage, ...filtered].slice(0, MAX_RECENT)

			// Save to localStorage
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
			} catch (e) {
				console.error("Failed to save recent pages:", e)
			}

			return updated
		})
	}, [pathname])

	const clearRecent = useCallback(() => {
		setRecentPages([])
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch (e) {
			console.error("Failed to clear recent pages:", e)
		}
	}, [])

	// Return pages excluding current page
	const recentPagesExcludingCurrent = recentPages.filter((p) => p.path !== pathname)

	return {
		recentPages: recentPagesExcludingCurrent,
		clearRecent,
	}
}
