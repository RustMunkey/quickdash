"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type SidebarMode = "normal" | "messages" | "workflow"

type SidebarModeContextType = {
	mode: SidebarMode
	setMode: (mode: SidebarMode) => void
	previousPath: string | null
	setPreviousPath: (path: string | null) => void
	exitMessagesMode: () => void
	exitWorkflowMode: () => void
}

const SidebarModeContext = React.createContext<SidebarModeContextType | null>(null)

export function SidebarModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = React.useState<SidebarMode>("normal")
	const [previousPath, setPreviousPath] = React.useState<string | null>(null)
	const router = useRouter()

	const exitMessagesMode = React.useCallback(() => {
		setMode("normal")
		if (previousPath) {
			router.push(previousPath)
			setPreviousPath(null)
		} else {
			router.push("/")
		}
	}, [previousPath, router])

	const exitWorkflowMode = React.useCallback(() => {
		setMode("normal")
		router.push("/automation")
	}, [router])

	return (
		<SidebarModeContext.Provider
			value={{
				mode,
				setMode,
				previousPath,
				setPreviousPath,
				exitMessagesMode,
				exitWorkflowMode,
			}}
		>
			{children}
		</SidebarModeContext.Provider>
	)
}

export function useSidebarMode() {
	const context = React.useContext(SidebarModeContext)
	if (!context) {
		throw new Error("useSidebarMode must be used within a SidebarModeProvider")
	}
	return context
}
