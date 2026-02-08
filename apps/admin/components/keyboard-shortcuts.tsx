"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useRightSidebar } from "@/components/ui/right-sidebar"
import { useCommandMenu } from "@/components/command-menu"
import {
	getKeybindings,
	formatKeys,
	matchesEvent,
	type KeyBinding,
} from "@/lib/keybindings"

export type Shortcut = KeyBinding & {
	action: () => void
}

type KeyboardShortcutsContextType = {
	shortcuts: Shortcut[]
	showHelp: () => void
	hideHelp: () => void
	isHelpOpen: boolean
}

const KeyboardShortcutsContext = React.createContext<KeyboardShortcutsContextType | null>(null)

export function useKeyboardShortcuts() {
	const context = React.useContext(KeyboardShortcutsContext)
	if (!context) {
		throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider")
	}
	return context
}

// Check if we're in an input element
function isInputElement(target: EventTarget | null): boolean {
	if (!target) return false
	const element = target as HTMLElement
	const tagName = element.tagName?.toLowerCase()
	return (
		tagName === "input" ||
		tagName === "textarea" ||
		tagName === "select" ||
		element.isContentEditable
	)
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
	const [shortcuts, setShortcuts] = React.useState<Shortcut[]>([])
	const [isHelpOpen, setIsHelpOpen] = React.useState(false)
	const router = useRouter()
	const { setTheme } = useTheme()
	const { toggleSidebar } = useRightSidebar()
	const { open: openCommandMenu } = useCommandMenu()

	// Use refs to avoid stale closures
	const routerRef = React.useRef(router)
	const setThemeRef = React.useRef(setTheme)
	const toggleSidebarRef = React.useRef(toggleSidebar)
	const openCommandMenuRef = React.useRef(openCommandMenu)

	React.useEffect(() => {
		routerRef.current = router
		setThemeRef.current = setTheme
		toggleSidebarRef.current = toggleSidebar
		openCommandMenuRef.current = openCommandMenu
	})

	// Build shortcuts from keybindings
	const buildShortcuts = React.useCallback(() => {
		const bindings = getKeybindings()

		// Map binding IDs to actions
		const actions: Record<string, () => void> = {
			"go-home": () => routerRef.current.push("/"),
			"go-orders": () => routerRef.current.push("/orders"),
			"go-products": () => routerRef.current.push("/products"),
			"go-customers": () => routerRef.current.push("/customers"),
			"go-analytics": () => routerRef.current.push("/analytics"),
			"go-settings": () => routerRef.current.push("/settings"),
			"go-messages": () => routerRef.current.push("/messages"),
			"go-back": () => routerRef.current.back(),
			"go-forward": () => routerRef.current.forward(),
			"go-inventory": () => routerRef.current.push("/inventory"),
			"go-shipping": () => routerRef.current.push("/shipping"),
			"go-content": () => routerRef.current.push("/content"),
			"search": () => openCommandMenuRef.current(),
			"new-product": () => routerRef.current.push("/products?new=true"),
			"new-order": () => routerRef.current.push("/orders?new=true"),
			"toggle-sidebar": () => toggleSidebarRef.current(),
			"toggle-theme": () => {
				const html = document.documentElement
				const current = html.classList.contains("dark") ? "dark" : "light"
				setThemeRef.current(current === "dark" ? "light" : "dark")
			},
			"show-shortcuts": () => setIsHelpOpen(true),
			"toggle-toolbar": () => {
				window.dispatchEvent(new CustomEvent("toggle-toolbar"))
			},
			"save": () => {
				document.dispatchEvent(new CustomEvent("keyboard-save"))
			},
			"submit-form": () => {
				document.dispatchEvent(new CustomEvent("keyboard-submit"))
			},
			"escape": () => {
				document.dispatchEvent(new CustomEvent("keyboard-escape"))
			},
			// Widget actions
			"widget-calendar": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "calendar" })),
			"widget-calculator": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "calculator" })),
			"widget-music": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "music" })),
			"widget-stopwatch": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "stopwatch" })),
			"widget-notes": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "notes" })),
			"widget-stats": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "stats" })),
			"widget-converter": () => window.dispatchEvent(new CustomEvent("open-widget", { detail: "converter" })),
		}

		const newShortcuts: Shortcut[] = bindings
			.filter((b) => actions[b.id])
			.map((binding) => ({
				...binding,
				action: actions[binding.id],
			}))

		setShortcuts(newShortcuts)
	}, [])

	// Initial build and listen for changes
	React.useEffect(() => {
		buildShortcuts()

		const handleChange = () => buildShortcuts()
		window.addEventListener("keybindings-changed", handleChange)
		return () => window.removeEventListener("keybindings-changed", handleChange)
	}, [buildShortcuts])

	// Global keyboard listener
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Skip if in help dialog and pressing something other than escape
			if (isHelpOpen && e.key !== "Escape") return

			for (const shortcut of shortcuts) {
				if (shortcut.keys.length === 0) continue

				if (matchesEvent(shortcut.keys, e)) {
					// Skip non-global shortcuts when in input
					if (!shortcut.global && isInputElement(e.target)) {
						continue
					}

					e.preventDefault()
					shortcut.action()
					return
				}
			}
		}

		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [shortcuts, isHelpOpen])

	const showHelp = React.useCallback(() => setIsHelpOpen(true), [])
	const hideHelp = React.useCallback(() => setIsHelpOpen(false), [])

	const categories = React.useMemo(() => {
		const nav = shortcuts.filter((s) => s.category === "navigation")
		const actions = shortcuts.filter((s) => s.category === "actions")
		const view = shortcuts.filter((s) => s.category === "view")
		const editing = shortcuts.filter((s) => s.category === "editing")
		const widgets = shortcuts.filter((s) => s.category === "widgets")
		return { nav, actions, view, editing, widgets }
	}, [shortcuts])

	return (
		<KeyboardShortcutsContext.Provider
			value={{
				shortcuts,
				showHelp,
				hideHelp,
				isHelpOpen,
			}}
		>
			{children}
			<Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Keyboard Shortcuts</DialogTitle>
					</DialogHeader>
					<div className="grid gap-6 py-4">
						{categories.nav.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">Navigation</h3>
								<div className="space-y-2">
									{categories.nav.map((s) => (
										<ShortcutRow key={s.id} shortcut={s} />
									))}
								</div>
							</div>
						)}
						{categories.actions.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">Actions</h3>
								<div className="space-y-2">
									{categories.actions.map((s) => (
										<ShortcutRow key={s.id} shortcut={s} />
									))}
								</div>
							</div>
						)}
						{categories.view.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">View</h3>
								<div className="space-y-2">
									{categories.view.map((s) => (
										<ShortcutRow key={s.id} shortcut={s} />
									))}
								</div>
							</div>
						)}
						{categories.editing.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">Editing</h3>
								<div className="space-y-2">
									{categories.editing.map((s) => (
										<ShortcutRow key={s.id} shortcut={s} />
									))}
								</div>
							</div>
						)}
						{categories.widgets.length > 0 && (
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground mb-3">Widgets</h3>
								<div className="space-y-2">
									{categories.widgets.map((s) => (
										<ShortcutRow key={s.id} shortcut={s} />
									))}
								</div>
							</div>
						)}
					</div>
					<div className="text-xs text-muted-foreground border-t pt-4">
						Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> to close.
						Customize shortcuts in <a href="/settings/account" className="text-primary hover:underline">Settings</a>.
					</div>
				</DialogContent>
			</Dialog>
		</KeyboardShortcutsContext.Provider>
	)
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
	return (
		<div className="flex items-center justify-between py-1.5">
			<div>
				<p className="text-sm font-medium">{shortcut.name}</p>
				<p className="text-xs text-muted-foreground">{shortcut.description}</p>
			</div>
			<kbd className={`px-2 py-1 bg-muted rounded text-xs font-mono ${shortcut.keys.length === 0 ? "text-muted-foreground" : ""}`}>
				{formatKeys(shortcut.keys)}
			</kbd>
		</div>
	)
}
