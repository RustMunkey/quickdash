"use client"

import { useState, useEffect, useCallback, createContext, useContext } from "react"
import type { PresenceStatus } from "@/components/presence/status-indicator"

const STORAGE_KEY = "quickdash-user-status"
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export type UserStatusMode = "auto" | "online" | "idle" | "dnd" | "offline"

interface UserStatusContextType {
	status: PresenceStatus
	mode: UserStatusMode
	setMode: (mode: UserStatusMode) => void
	isManuallySet: boolean
	clearManualStatus: () => void
}

const UserStatusContext = createContext<UserStatusContextType | null>(null)

export function useUserStatus() {
	const context = useContext(UserStatusContext)
	if (!context) {
		throw new Error("useUserStatus must be used within UserStatusProvider")
	}
	return context
}

export function useUserStatusProvider(isConnected: boolean) {
	const [mode, setModeState] = useState<UserStatusMode>("auto")
	const [isTabIdle, setIsTabIdle] = useState(false)

	// Load saved mode from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				const parsed = JSON.parse(stored)
				if (parsed.mode && parsed.expiresAt > Date.now()) {
					setModeState(parsed.mode)
				} else {
					localStorage.removeItem(STORAGE_KEY)
				}
			}
		} catch (e) {
			console.error("Failed to load user status:", e)
		}
	}, [])

	// Idle detection via Page Visibility API (only in auto mode)
	useEffect(() => {
		if (mode !== "auto") {
			setIsTabIdle(false)
			return
		}

		let idleTimer: ReturnType<typeof setTimeout>

		const handleVisibility = () => {
			if (document.visibilityState === "hidden") {
				idleTimer = setTimeout(() => setIsTabIdle(true), IDLE_TIMEOUT_MS)
			} else {
				clearTimeout(idleTimer)
				setIsTabIdle(false)
			}
		}

		document.addEventListener("visibilitychange", handleVisibility)
		return () => {
			document.removeEventListener("visibilitychange", handleVisibility)
			clearTimeout(idleTimer)
		}
	}, [mode])

	// Compute effective visible status from mode + connection + idle state
	const status: PresenceStatus = (() => {
		if (mode === "auto") {
			if (!isConnected) return "offline"
			if (isTabIdle) return "idle"
			return "online"
		}
		if (mode === "dnd") return "dnd"
		if (mode === "idle") return "idle"
		if (mode === "offline") return "offline"
		// mode === "online"
		if (!isConnected) return "offline"
		return "online"
	})()

	const setMode = useCallback((newMode: UserStatusMode) => {
		setModeState(newMode)
		if (newMode === "auto") {
			try {
				localStorage.removeItem(STORAGE_KEY)
			} catch {}
		} else {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					mode: newMode,
					expiresAt: Date.now() + 24 * 60 * 60 * 1000,
				}))
			} catch (e) {
				console.error("Failed to save user status:", e)
			}
		}
	}, [])

	const clearManualStatus = useCallback(() => {
		setModeState("auto")
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch {}
	}, [])

	return {
		status,
		mode,
		setMode,
		isManuallySet: mode !== "auto",
		clearManualStatus,
	}
}

export { UserStatusContext }
