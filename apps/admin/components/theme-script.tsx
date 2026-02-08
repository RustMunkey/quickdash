import { themePresets } from "./theme-presets"

// Generate the blocking script that applies theme before paint
// This prevents flash of default theme colors
export function ThemeScript() {
	// Serialize theme presets to JSON for embedding in script
	const presetsJson = JSON.stringify(themePresets)

	const script = `
(function() {
	try {
		var presets = ${presetsJson};
		// Try to find a user-specific theme key (multi-tenant isolation)
		// Falls back to legacy key or default if none found
		var savedAccent = "neutral";
		for (var i = 0; i < localStorage.length; i++) {
			var key = localStorage.key(i);
			if (key && key.startsWith("quickdash-accent-theme-")) {
				// Use the first user-specific theme found (will be corrected by AccentThemeProvider)
				savedAccent = localStorage.getItem(key) || "neutral";
				break;
			}
		}
		// Fallback to legacy key for backwards compatibility
		if (savedAccent === "neutral") {
			savedAccent = localStorage.getItem("quickdash-accent-theme") || "neutral";
		}
		var savedTheme = localStorage.getItem("quickdash-theme") || "system";

		// Determine if dark mode
		var isDark = savedTheme === "dark" ||
			(savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

		var preset = presets[savedAccent];
		if (!preset) preset = presets.coffee;

		var colors = isDark ? preset.dark : preset.light;

		// Create a style tag with high specificity to override defaults
		var style = document.createElement("style");
		style.id = "theme-variables";
		style.textContent = \`
			html:root, :root {
				--background: \${colors.background} !important;
				--foreground: \${colors.foreground} !important;
				--card: \${colors.card} !important;
				--card-foreground: \${colors.cardForeground} !important;
				--popover: \${colors.popover} !important;
				--popover-foreground: \${colors.popoverForeground} !important;
				--primary: \${colors.primary} !important;
				--primary-foreground: \${colors.primaryForeground} !important;
				--secondary: \${colors.secondary} !important;
				--secondary-foreground: \${colors.secondaryForeground} !important;
				--muted: \${colors.muted} !important;
				--muted-foreground: \${colors.mutedForeground} !important;
				--accent: \${colors.accent} !important;
				--accent-foreground: \${colors.accentForeground} !important;
				--border: \${colors.border} !important;
				--input: \${colors.input} !important;
				--ring: \${colors.ring} !important;
				--chart-1: \${colors.chart1} !important;
				--chart-2: \${colors.chart2} !important;
				--chart-3: \${colors.chart3} !important;
				--chart-4: \${colors.chart4} !important;
				--chart-5: \${colors.chart5} !important;
				--sidebar: \${colors.sidebar} !important;
				--sidebar-foreground: \${colors.sidebarForeground} !important;
				--sidebar-primary: \${colors.sidebarPrimary} !important;
				--sidebar-primary-foreground: \${colors.sidebarPrimaryForeground} !important;
				--sidebar-accent: \${colors.sidebarAccent} !important;
				--sidebar-accent-foreground: \${colors.sidebarAccentForeground} !important;
				--sidebar-border: \${colors.sidebarBorder} !important;
				--sidebar-ring: \${colors.sidebarRing} !important;
				--stat-up: \${colors.statUp} !important;
				--stat-down: \${colors.statDown} !important;
			}
		\`;

		// Generate heatmap colors
		var chart1Match = colors.chart1.match(/oklch\\(([0-9.]+)\\s+([0-9.]+)\\s+([0-9.]+)\\)/);
		if (chart1Match) {
			var c = parseFloat(chart1Match[2]);
			var h = parseFloat(chart1Match[3]);
			var heatmapCss = "";
			if (isDark) {
				heatmapCss = \`
					html:root, :root {
						--heatmap-0: oklch(0.18 \${(c * 0.15).toFixed(3)} \${h}) !important;
						--heatmap-1: oklch(0.30 \${(c * 0.40).toFixed(3)} \${h}) !important;
						--heatmap-2: oklch(0.42 \${(c * 0.65).toFixed(3)} \${h}) !important;
						--heatmap-3: oklch(0.54 \${(c * 0.85).toFixed(3)} \${h}) !important;
						--heatmap-4: oklch(0.66 \${(c * 1.00).toFixed(3)} \${h}) !important;
						--heatmap-5: oklch(0.78 \${(c * 1.00).toFixed(3)} \${h}) !important;
					}
				\`;
			} else {
				heatmapCss = \`
					html:root, :root {
						--heatmap-0: oklch(0.94 \${(c * 0.15).toFixed(3)} \${h}) !important;
						--heatmap-1: oklch(0.84 \${(c * 0.40).toFixed(3)} \${h}) !important;
						--heatmap-2: oklch(0.72 \${(c * 0.65).toFixed(3)} \${h}) !important;
						--heatmap-3: oklch(0.60 \${(c * 0.85).toFixed(3)} \${h}) !important;
						--heatmap-4: oklch(0.50 \${(c * 1.00).toFixed(3)} \${h}) !important;
						--heatmap-5: oklch(0.40 \${(c * 1.00).toFixed(3)} \${h}) !important;
					}
				\`;
			}
			style.textContent += heatmapCss;
		}

		// Insert at the beginning of head to ensure it loads before other styles
		document.head.insertBefore(style, document.head.firstChild);
	} catch(e) {
		console.error("Theme script error:", e);
	}
})();
`

	return (
		<script
			dangerouslySetInnerHTML={{ __html: script }}
			suppressHydrationWarning
		/>
	)
}
