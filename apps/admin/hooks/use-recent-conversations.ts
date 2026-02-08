"use client"

import { useState, useEffect, useCallback } from "react"
import type { Conversation } from "@/app/(dashboard)/messages/types"

interface RecentConversation extends Conversation {
	visitedAt: number
}

const STORAGE_KEY = "quickdash-recent-conversations"
const MAX_RECENT = 5

export function useRecentConversations() {
	const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				setRecentConversations(JSON.parse(stored))
			}
		} catch (e) {
			console.error("Failed to load recent conversations:", e)
		}
	}, [])

	// Track a conversation visit
	const trackConversation = useCallback((conversation: Conversation) => {
		setRecentConversations((prev) => {
			const newEntry: RecentConversation = {
				...conversation,
				visitedAt: Date.now(),
			}

			// Remove existing entry for this conversation
			const filtered = prev.filter(
				(c) => !(c.type === conversation.type && c.id === conversation.id)
			)
			// Add new entry at the beginning
			const updated = [newEntry, ...filtered].slice(0, MAX_RECENT)

			// Save to localStorage
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
			} catch (e) {
				console.error("Failed to save recent conversations:", e)
			}

			return updated
		})
	}, [])

	const clearRecent = useCallback(() => {
		setRecentConversations([])
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch (e) {
			console.error("Failed to clear recent conversations:", e)
		}
	}, [])

	return {
		recentConversations,
		trackConversation,
		clearRecent,
	}
}
