"use client"

import { useEffect } from "react"

interface DynamicBrandingProps {
	faviconUrl?: string | null
	storeName?: string | null
	tagline?: string | null
	isAdmin?: boolean
}

export function DynamicFavicon({ faviconUrl, storeName, tagline, isAdmin = true }: DynamicBrandingProps) {
	// Update document title
	// Admin panel: "StoreName Admin"
	// Storefront: "StoreName • Tagline"
	useEffect(() => {
		if (storeName) {
			if (isAdmin) {
				document.title = `${storeName} Admin`
			} else {
				const suffix = tagline ? ` • ${tagline}` : ""
				document.title = `${storeName}${suffix}`
			}
		}
	}, [storeName, tagline, isAdmin])

	// Update favicon
	useEffect(() => {
		if (!faviconUrl) return

		// Find existing favicon links
		const existingLinks = document.querySelectorAll("link[rel*='icon']")

		// Remove existing favicons
		existingLinks.forEach((link) => link.remove())

		// Create new favicon link
		const link = document.createElement("link")
		link.rel = "icon"
		link.href = faviconUrl

		// Try to detect type from URL
		if (faviconUrl.endsWith(".svg")) {
			link.type = "image/svg+xml"
		} else if (faviconUrl.endsWith(".png")) {
			link.type = "image/png"
		} else if (faviconUrl.endsWith(".ico")) {
			link.type = "image/x-icon"
		}

		document.head.appendChild(link)

		// Also add apple-touch-icon for mobile
		const appleLink = document.createElement("link")
		appleLink.rel = "apple-touch-icon"
		appleLink.href = faviconUrl
		document.head.appendChild(appleLink)

		// Cleanup on unmount
		return () => {
			link.remove()
			appleLink.remove()
		}
	}, [faviconUrl])

	return null
}
