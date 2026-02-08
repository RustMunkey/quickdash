// Default keybindings configuration
// Users can customize these in Settings > Account > Keyboard Shortcuts

export type KeyBinding = {
	id: string
	name: string
	description: string
	keys: string[] // e.g., ["meta", "k"] or ["meta", "shift", "p"]
	category: "navigation" | "actions" | "view" | "editing" | "widgets"
	global?: boolean // Works everywhere, even in inputs
}

// Industry-standard defaults where possible
export const DEFAULT_KEYBINDINGS: KeyBinding[] = [
	// Navigation
	{
		id: "go-home",
		name: "Go to Dashboard",
		description: "Navigate to the dashboard",
		keys: ["meta", "shift", "h"],
		category: "navigation",
	},
	{
		id: "go-orders",
		name: "Go to Orders",
		description: "Navigate to orders",
		keys: ["meta", "shift", "o"],
		category: "navigation",
	},
	{
		id: "go-products",
		name: "Go to Products",
		description: "Navigate to products",
		keys: ["meta", "shift", "p"],
		category: "navigation",
	},
	{
		id: "go-customers",
		name: "Go to Customers",
		description: "Navigate to customers",
		keys: ["meta", "shift", "c"],
		category: "navigation",
	},
	{
		id: "go-analytics",
		name: "Go to Analytics",
		description: "Navigate to analytics",
		keys: ["meta", "shift", "a"],
		category: "navigation",
	},
	{
		id: "go-settings",
		name: "Go to Settings",
		description: "Navigate to settings",
		keys: ["meta", ","],
		category: "navigation",
	},
	{
		id: "go-messages",
		name: "Go to Messages",
		description: "Navigate to messages",
		keys: ["meta", "shift", "m"],
		category: "navigation",
	},
	{
		id: "go-back",
		name: "Go Back",
		description: "Navigate to previous page",
		keys: ["meta", "["],
		category: "navigation",
	},
	{
		id: "go-forward",
		name: "Go Forward",
		description: "Navigate to next page",
		keys: ["meta", "]"],
		category: "navigation",
	},
	{
		id: "go-inventory",
		name: "Go to Inventory",
		description: "Navigate to inventory",
		keys: ["meta", "shift", "i"],
		category: "navigation",
	},
	{
		id: "go-shipping",
		name: "Go to Shipping",
		description: "Navigate to shipping",
		keys: ["meta", "shift", "s"],
		category: "navigation",
	},
	{
		id: "go-content",
		name: "Go to Content",
		description: "Navigate to content editor",
		keys: ["meta", "shift", "e"],
		category: "navigation",
	},

	// Actions
	{
		id: "search",
		name: "Search",
		description: "Open command palette",
		keys: ["meta", "k"],
		category: "actions",
		global: true,
	},
	{
		id: "new-product",
		name: "New Product",
		description: "Create a new product",
		keys: ["meta", "shift", "n"],
		category: "actions",
	},
	{
		id: "new-order",
		name: "New Order",
		description: "Create a new order",
		keys: ["alt", "shift", "o"],
		category: "actions",
	},

	// View
	{
		id: "toggle-sidebar",
		name: "Toggle Right Sidebar",
		description: "Show or hide the right sidebar",
		keys: ["meta", "shift", "b"],
		category: "view",
		global: true,
	},
	{
		id: "toggle-theme",
		name: "Toggle Theme",
		description: "Switch between light and dark mode",
		keys: ["meta", "shift", "l"],
		category: "view",
	},
	{
		id: "show-shortcuts",
		name: "Show Shortcuts",
		description: "Display keyboard shortcuts help",
		keys: ["meta", "/"],
		category: "view",
	},
	{
		id: "toggle-toolbar",
		name: "Toggle Toolbar",
		description: "Show or hide the widgets toolbar",
		keys: ["meta", "\\"],
		category: "view",
		global: true,
	},

	// Editing
	{
		id: "save",
		name: "Save",
		description: "Save current form",
		keys: ["meta", "s"],
		category: "editing",
		global: true,
	},
	{
		id: "submit-form",
		name: "Submit Form",
		description: "Submit the current form",
		keys: ["meta", "enter"],
		category: "editing",
		global: true,
	},
	{
		id: "escape",
		name: "Close / Cancel",
		description: "Close modal or cancel action",
		keys: ["escape"],
		category: "editing",
		global: true,
	},

	// Widgets (no shortcuts by default to avoid conflicts - users can set them)
	{
		id: "widget-calculator",
		name: "Open Calculator",
		description: "Open the calculator widget",
		keys: [],
		category: "widgets",
	},
	{
		id: "widget-music",
		name: "Open Music",
		description: "Open the music player widget",
		keys: [],
		category: "widgets",
	},
	{
		id: "widget-notes",
		name: "Open Notes",
		description: "Open the notes widget",
		keys: [],
		category: "widgets",
	},
	{
		id: "widget-stats",
		name: "Open Quick Stats",
		description: "Open the quick stats widget",
		keys: [],
		category: "widgets",
	},
	{
		id: "widget-converter",
		name: "Open Converter",
		description: "Open the unit converter widget",
		keys: [],
		category: "widgets",
	},
]

const STORAGE_KEY = "quickdash-keybindings"

// Get user's custom keybindings merged with defaults
export function getKeybindings(): KeyBinding[] {
	if (typeof window === "undefined") return DEFAULT_KEYBINDINGS

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return DEFAULT_KEYBINDINGS

		const customBindings: Record<string, string[]> = JSON.parse(stored)

		return DEFAULT_KEYBINDINGS.map((binding) => {
			if (customBindings[binding.id] !== undefined) {
				return { ...binding, keys: customBindings[binding.id] }
			}
			return binding
		})
	} catch {
		return DEFAULT_KEYBINDINGS
	}
}

// Save a custom keybinding
export function setKeybinding(id: string, keys: string[]): { success: boolean; conflict?: string } {
	if (typeof window === "undefined") return { success: false }

	// Check for conflicts (skip if keys is empty - means disabled)
	if (keys.length > 0) {
		const conflict = checkConflict(id, keys)
		if (conflict) {
			return { success: false, conflict }
		}
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		const customBindings: Record<string, string[]> = stored ? JSON.parse(stored) : {}

		customBindings[id] = keys
		localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings))

		// Dispatch event so components can react
		window.dispatchEvent(new CustomEvent("keybindings-changed"))

		return { success: true }
	} catch {
		return { success: false }
	}
}

// Reset a keybinding to default
export function resetKeybinding(id: string): void {
	if (typeof window === "undefined") return

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		const customBindings: Record<string, string[]> = JSON.parse(stored)
		delete customBindings[id]

		if (Object.keys(customBindings).length === 0) {
			localStorage.removeItem(STORAGE_KEY)
		} else {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(customBindings))
		}

		window.dispatchEvent(new CustomEvent("keybindings-changed"))
	} catch {
		// Ignore errors
	}
}

// Reset all keybindings to defaults
export function resetAllKeybindings(): void {
	if (typeof window === "undefined") return
	localStorage.removeItem(STORAGE_KEY)
	window.dispatchEvent(new CustomEvent("keybindings-changed"))
}

// Check if a keybinding conflicts with another
export function checkConflict(id: string, keys: string[]): string | null {
	if (keys.length === 0) return null

	const keysStr = keys.sort().join("+")
	const bindings = getKeybindings()

	for (const binding of bindings) {
		if (binding.id === id) continue
		if (binding.keys.length === 0) continue

		const bindingKeysStr = binding.keys.sort().join("+")
		if (keysStr === bindingKeysStr) {
			return binding.name
		}
	}

	return null
}

// Format keys for display
export function formatKeys(keys: string[]): string {
	if (keys.length === 0) return "Not set"

	const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0
	const MOD = isMac ? "⌘" : "Ctrl"
	const ALT = isMac ? "⌥" : "Alt"
	const SHIFT = "⇧"

	return keys
		.map((key) => {
			switch (key) {
				case "meta":
					return MOD
				case "alt":
					return ALT
				case "shift":
					return SHIFT
				case "enter":
					return "↵"
				case "escape":
					return "Esc"
				case "arrowup":
					return "↑"
				case "arrowdown":
					return "↓"
				case "arrowleft":
					return "←"
				case "arrowright":
					return "→"
				case "backspace":
					return "⌫"
				case "delete":
					return "Del"
				case "tab":
					return "Tab"
				case "space":
					return "Space"
				case "\\":
					return "\\"
				case "/":
					return "/"
				case ",":
					return ","
				case "[":
					return "["
				case "]":
					return "]"
				default:
					return key.toUpperCase()
			}
		})
		.join("")
}

// Parse a keyboard event into keys array
export function parseKeyboardEvent(e: KeyboardEvent): string[] {
	const keys: string[] = []

	if (e.metaKey || e.ctrlKey) keys.push("meta")
	if (e.altKey) keys.push("alt")
	if (e.shiftKey) keys.push("shift")

	const key = e.key.toLowerCase()
	if (!["meta", "control", "alt", "shift"].includes(key)) {
		keys.push(key)
	}

	return keys
}

// Check if keys match an event
export function matchesEvent(keys: string[], e: KeyboardEvent): boolean {
	if (!e.key || keys.length === 0) return false

	const pressedKeys = parseKeyboardEvent(e)

	if (pressedKeys.length !== keys.length) return false
	return keys.every((k) => pressedKeys.includes(k))
}
