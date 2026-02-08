"use client"

import * as React from "react"

export type CalculatorMode = "basic" | "currency" | "margin" | "tax"

type CalculatorWidgetContextType = {
	isOpen: boolean
	isMinimized: boolean
	mode: CalculatorMode
	openWidget: () => void
	closeWidget: () => void
	toggleMinimize: () => void
	setMode: (mode: CalculatorMode) => void
}

const CalculatorWidgetContext = React.createContext<CalculatorWidgetContextType | null>(null)

export function useCalculatorWidget() {
	const context = React.useContext(CalculatorWidgetContext)
	if (!context) {
		throw new Error("useCalculatorWidget must be used within CalculatorWidgetProvider")
	}
	return context
}

export function CalculatorWidgetProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = React.useState(false)
	const [isMinimized, setIsMinimized] = React.useState(false)
	const [mode, setMode] = React.useState<CalculatorMode>("basic")

	const openWidget = React.useCallback(() => {
		setIsOpen(true)
		setIsMinimized(false)
	}, [])

	const closeWidget = React.useCallback(() => {
		setIsOpen(false)
		setIsMinimized(false)
	}, [])

	const toggleMinimize = React.useCallback(() => {
		setIsMinimized((prev) => !prev)
	}, [])

	return (
		<CalculatorWidgetContext.Provider
			value={{
				isOpen,
				isMinimized,
				mode,
				openWidget,
				closeWidget,
				toggleMinimize,
				setMode,
			}}
		>
			{children}
		</CalculatorWidgetContext.Provider>
	)
}
