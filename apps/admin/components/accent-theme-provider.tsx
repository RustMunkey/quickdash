"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { themePresets } from "./theme-presets"
import { useSession } from "@/lib/auth-client"

// Re-export for backwards compatibility with existing imports
export { themePresets } from "./theme-presets"

type AccentThemeContextType = {
	accentTheme: string
	setAccentTheme: (theme: string) => void
}

const AccentThemeContext = createContext<AccentThemeContextType | null>(null)

// Generate user-specific localStorage key for theme isolation
function getThemeStorageKey(userId: string | undefined): string {
	if (userId) {
		return `quickdash-accent-theme-${userId}`
	}
	// Fallback for unauthenticated state (should rarely happen in app)
	return "quickdash-accent-theme-anonymous"
}

export function useAccentTheme() {
	const context = useContext(AccentThemeContext)
	// Return default values if used outside provider (e.g., during SSR)
	if (!context) {
		return { accentTheme: "neutral", setAccentTheme: () => {} }
	}
	return context
}

function applyAccentTheme(themeId: string, isDark: boolean) {
	const preset = themePresets[themeId]
	if (!preset) return

	const colors = isDark ? preset.dark : preset.light
	const root = document.documentElement

	// Remove the blocking script's style tag so our inline styles take precedence
	const blockingStyle = document.getElementById("theme-variables")
	if (blockingStyle) {
		blockingStyle.remove()
	}

	root.style.setProperty("--background", colors.background)
	root.style.setProperty("--foreground", colors.foreground)
	root.style.setProperty("--card", colors.card)
	root.style.setProperty("--card-foreground", colors.cardForeground)
	root.style.setProperty("--popover", colors.popover)
	root.style.setProperty("--popover-foreground", colors.popoverForeground)
	root.style.setProperty("--primary", colors.primary)
	root.style.setProperty("--primary-foreground", colors.primaryForeground)
	root.style.setProperty("--secondary", colors.secondary)
	root.style.setProperty("--secondary-foreground", colors.secondaryForeground)
	root.style.setProperty("--muted", colors.muted)
	root.style.setProperty("--muted-foreground", colors.mutedForeground)
	root.style.setProperty("--accent", colors.accent)
	root.style.setProperty("--accent-foreground", colors.accentForeground)
	root.style.setProperty("--border", colors.border)
	root.style.setProperty("--input", colors.input)
	root.style.setProperty("--ring", colors.ring)
	root.style.setProperty("--chart-1", colors.chart1)
	root.style.setProperty("--chart-2", colors.chart2)
	root.style.setProperty("--chart-3", colors.chart3)
	root.style.setProperty("--chart-4", colors.chart4)
	root.style.setProperty("--chart-5", colors.chart5)
	root.style.setProperty("--sidebar", colors.sidebar)
	root.style.setProperty("--sidebar-foreground", colors.sidebarForeground)
	root.style.setProperty("--sidebar-primary", colors.sidebarPrimary)
	root.style.setProperty("--sidebar-primary-foreground", colors.sidebarPrimaryForeground)
	root.style.setProperty("--sidebar-accent", colors.sidebarAccent)
	root.style.setProperty("--sidebar-accent-foreground", colors.sidebarAccentForeground)
	root.style.setProperty("--sidebar-border", colors.sidebarBorder)
	root.style.setProperty("--sidebar-ring", colors.sidebarRing)
	root.style.setProperty("--stat-up", colors.statUp)
	root.style.setProperty("--stat-down", colors.statDown)

	// Generate heatmap colors from chart1 (primary theme color)
	// Parse the OKLCH values from chart1 to create intensity variations
	const chart1Match = colors.chart1.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/)
	if (chart1Match) {
		const [, , c, h] = chart1Match.map(Number)
		if (isDark) {
			// Dark mode: start from dark background, increase lightness for intensity
			root.style.setProperty("--heatmap-0", `oklch(0.18 ${(c * 0.15).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-1", `oklch(0.30 ${(c * 0.40).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-2", `oklch(0.42 ${(c * 0.65).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-3", `oklch(0.54 ${(c * 0.85).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-4", `oklch(0.66 ${(c * 1.00).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-5", `oklch(0.78 ${(c * 1.00).toFixed(3)} ${h})`)
		} else {
			// Light mode: start from light background, decrease lightness for intensity
			root.style.setProperty("--heatmap-0", `oklch(0.94 ${(c * 0.15).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-1", `oklch(0.84 ${(c * 0.40).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-2", `oklch(0.72 ${(c * 0.65).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-3", `oklch(0.60 ${(c * 0.85).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-4", `oklch(0.50 ${(c * 1.00).toFixed(3)} ${h})`)
			root.style.setProperty("--heatmap-5", `oklch(0.40 ${(c * 1.00).toFixed(3)} ${h})`)
		}
	}
}

export function AccentThemeProvider({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme()
	const { data: session } = useSession()
	const userId = session?.user?.id
	const [accentTheme, setAccentThemeState] = useState("neutral")

	// Get the user-specific storage key
	const storageKey = getThemeStorageKey(userId)

	const setAccentTheme = (theme: string) => {
		setAccentThemeState(theme)
		localStorage.setItem(storageKey, theme)
		const isDark = resolvedTheme === "dark"
		applyAccentTheme(theme, isDark)
	}

	// Load theme when user ID changes (login/logout) or resolved theme changes
	useEffect(() => {
		const savedAccent = localStorage.getItem(storageKey) || "neutral"
		setAccentThemeState(savedAccent)
		const isDark = resolvedTheme === "dark"
		applyAccentTheme(savedAccent, isDark)
	}, [resolvedTheme, storageKey])

	// Listen for accent theme changes from settings page (same tab)
	useEffect(() => {
		const handleAccentChange = (e: CustomEvent<string>) => {
			setAccentThemeState(e.detail)
			const isDark = resolvedTheme === "dark"
			applyAccentTheme(e.detail, isDark)
		}

		window.addEventListener("accent-theme-change", handleAccentChange as EventListener)
		return () => window.removeEventListener("accent-theme-change", handleAccentChange as EventListener)
	}, [resolvedTheme])

	// Listen for accent theme changes from other tabs (for same user)
	useEffect(() => {
		const handleStorage = (e: StorageEvent) => {
			// Only respond to changes for the current user's theme key
			if (e.key === storageKey && e.newValue) {
				setAccentThemeState(e.newValue)
				const isDark = resolvedTheme === "dark"
				applyAccentTheme(e.newValue, isDark)
			}
		}

		window.addEventListener("storage", handleStorage)
		return () => window.removeEventListener("storage", handleStorage)
	}, [resolvedTheme, storageKey])

	return (
		<AccentThemeContext.Provider value={{ accentTheme, setAccentTheme }}>
			{children}
		</AccentThemeContext.Provider>
	)
}
