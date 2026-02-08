"use client"

import { createContext, useContext, useState, useCallback, useLayoutEffect } from "react"

interface BreadcrumbContextValue {
	overrides: Record<string, string>
	setOverride: (segment: string, label: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
	overrides: {},
	setOverride: () => {},
})

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
	const [overrides, setOverrides] = useState<Record<string, string>>({})

	const setOverride = useCallback((segment: string, label: string) => {
		setOverrides((prev) => {
			if (prev[segment] === label) return prev
			return { ...prev, [segment]: label }
		})
	}, [])

	return (
		<BreadcrumbContext.Provider value={{ overrides, setOverride }}>
			{children}
		</BreadcrumbContext.Provider>
	)
}

export function useBreadcrumbOverride(segment: string, label: string) {
	const { setOverride } = useContext(BreadcrumbContext)
	useLayoutEffect(() => {
		setOverride(segment, label)
	}, [segment, label, setOverride])
}

export function useBreadcrumbOverrides() {
	return useContext(BreadcrumbContext).overrides
}
