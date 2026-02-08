"use client"

import * as React from "react"

export type ToolbarWidget =
	| "calculator"
	| "music"
	| "notes"
	| "stats"
	| "converter"
	| null

type NonNullWidget = Exclude<ToolbarWidget, null>

type ToolbarContextType = {
	isOpen: boolean
	activeWidgets: Set<NonNullWidget>
	/** @deprecated Use activeWidgets set instead */
	activeWidget: ToolbarWidget
	openToolbar: () => void
	closeToolbar: () => void
	toggleToolbar: () => void
	/** @deprecated Use toggleWidget instead */
	setActiveWidget: (widget: ToolbarWidget) => void
	openWidget: (widget: ToolbarWidget) => void
	toggleWidget: (widget: NonNullWidget) => void
	closeWidget: (widget: NonNullWidget) => void
	isWidgetOpen: (widget: NonNullWidget) => boolean
}

const ToolbarContext = React.createContext<ToolbarContextType | null>(null)

export function useToolbar() {
	const context = React.useContext(ToolbarContext)
	if (!context) {
		throw new Error("useToolbar must be used within ToolbarProvider")
	}
	return context
}

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = React.useState(false)
	const [activeWidgets, setActiveWidgets] = React.useState<Set<NonNullWidget>>(new Set())

	const openToolbar = React.useCallback(() => {
		setIsOpen(true)
	}, [])

	const closeToolbar = React.useCallback(() => {
		setIsOpen(false)
	}, [])

	const toggleToolbar = React.useCallback(() => {
		setIsOpen((prev) => !prev)
	}, [])

	const toggleWidget = React.useCallback((widget: NonNullWidget) => {
		setActiveWidgets((prev) => {
			const next = new Set(prev)
			if (next.has(widget)) {
				next.delete(widget)
			} else {
				next.add(widget)
			}
			return next
		})
	}, [])

	const closeWidget = React.useCallback((widget: NonNullWidget) => {
		setActiveWidgets((prev) => {
			const next = new Set(prev)
			next.delete(widget)
			return next
		})
	}, [])

	const isWidgetOpen = React.useCallback((widget: NonNullWidget) => {
		return activeWidgets.has(widget)
	}, [activeWidgets])

	const openWidget = React.useCallback((widget: ToolbarWidget) => {
		if (widget) {
			toggleWidget(widget)
		}
		setIsOpen(true)
	}, [toggleWidget])

	// Backwards compat: setActiveWidget(null) closes all, setActiveWidget(x) toggles x
	const setActiveWidget = React.useCallback((widget: ToolbarWidget) => {
		if (widget === null) {
			setActiveWidgets(new Set())
		} else {
			toggleWidget(widget)
		}
	}, [toggleWidget])

	// Backwards compat: activeWidget returns first open widget or null
	const activeWidget = activeWidgets.size > 0 ? [...activeWidgets][0] : null

	// Listen for events from the central keyboard shortcuts system
	React.useEffect(() => {
		const handleToggleToolbar = () => {
			toggleToolbar()
		}

		const handleOpenWidget = (e: CustomEvent<string>) => {
			const widget = e.detail as NonNullWidget
			if (widget) {
				openWidget(widget)
			}
		}

		const handleEscape = () => {
			if (isOpen) {
				closeToolbar()
			}
		}

		window.addEventListener("toggle-toolbar", handleToggleToolbar)
		window.addEventListener("open-widget", handleOpenWidget as EventListener)
		window.addEventListener("keyboard-escape", handleEscape)

		return () => {
			window.removeEventListener("toggle-toolbar", handleToggleToolbar)
			window.removeEventListener("open-widget", handleOpenWidget as EventListener)
			window.removeEventListener("keyboard-escape", handleEscape)
		}
	}, [isOpen, toggleToolbar, closeToolbar, openWidget])

	return (
		<ToolbarContext.Provider
			value={{
				isOpen,
				activeWidgets,
				activeWidget,
				openToolbar,
				closeToolbar,
				toggleToolbar,
				setActiveWidget,
				openWidget,
				toggleWidget,
				closeWidget,
				isWidgetOpen,
			}}
		>
			{children}
		</ToolbarContext.Provider>
	)
}
