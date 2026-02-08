"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const DRAFTS_STORAGE_KEY = "quickdash-drafts"
const AUTO_SAVE_DELAY = 1000 // 1 second debounce

export type Draft = {
	id: string
	key: string // e.g., "note", "blog-post", "product"
	title: string // Display title for the draft
	data: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

type DraftStore = {
	drafts: Draft[]
}

function getStore(): DraftStore {
	if (typeof window === "undefined") return { drafts: [] }
	try {
		const stored = localStorage.getItem(DRAFTS_STORAGE_KEY)
		return stored ? JSON.parse(stored) : { drafts: [] }
	} catch {
		return { drafts: [] }
	}
}

function saveStore(store: DraftStore) {
	if (typeof window === "undefined") return
	try {
		localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(store))
	} catch {
		// Storage full or unavailable
	}
}

export function getAllDrafts(): Draft[] {
	return getStore().drafts.sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
	)
}

export function getDraftsByKey(key: string): Draft[] {
	return getAllDrafts().filter((d) => d.key === key)
}

export function getDraft(id: string): Draft | undefined {
	return getStore().drafts.find((d) => d.id === id)
}

export function saveDraft(draft: Omit<Draft, "id" | "createdAt" | "updatedAt"> & { id?: string }): Draft {
	const store = getStore()
	const now = new Date().toISOString()

	if (draft.id) {
		// Update existing draft
		const index = store.drafts.findIndex((d) => d.id === draft.id)
		if (index !== -1) {
			store.drafts[index] = {
				...store.drafts[index],
				...draft,
				updatedAt: now,
			}
			saveStore(store)
			return store.drafts[index]
		}
	}

	// Create new draft
	const newDraft: Draft = {
		id: crypto.randomUUID(),
		key: draft.key,
		title: draft.title,
		data: draft.data,
		createdAt: now,
		updatedAt: now,
	}
	store.drafts.push(newDraft)
	saveStore(store)
	return newDraft
}

export function deleteDraft(id: string) {
	const store = getStore()
	store.drafts = store.drafts.filter((d) => d.id !== id)
	saveStore(store)
}

export function clearDraftsByKey(key: string) {
	const store = getStore()
	store.drafts = store.drafts.filter((d) => d.key !== key)
	saveStore(store)
}

// Hook for using drafts in components
export function useDraft<T extends Record<string, unknown>>(options: {
	key: string // Unique key for this draft type (e.g., "note", "blog-post-123")
	getTitle: (data: T) => string // Function to generate draft title from data
	initialData?: T
	autoSave?: boolean
}) {
	const { key, getTitle, initialData, autoSave = true } = options
	const [draftId, setDraftId] = useState<string | null>(null)
	const [lastSaved, setLastSaved] = useState<Date | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const dataRef = useRef<T | undefined>(initialData)

	// Load existing draft on mount
	useEffect(() => {
		const drafts = getDraftsByKey(key)
		if (drafts.length > 0) {
			// Don't auto-load - let component decide via loadDraft
		}
	}, [key])

	const save = useCallback(
		(data: T, forceNewDraft = false) => {
			const title = getTitle(data)
			if (!title || title.trim() === "") return null

			setIsSaving(true)
			const draft = saveDraft({
				id: forceNewDraft ? undefined : draftId || undefined,
				key,
				title,
				data,
			})
			setDraftId(draft.id)
			setLastSaved(new Date())
			setIsSaving(false)
			dataRef.current = data
			return draft
		},
		[key, getTitle, draftId]
	)

	const debouncedSave = useCallback(
		(data: T) => {
			if (!autoSave) return
			dataRef.current = data

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}

			saveTimeoutRef.current = setTimeout(() => {
				save(data)
			}, AUTO_SAVE_DELAY)
		},
		[autoSave, save]
	)

	const loadDraft = useCallback((draft: Draft) => {
		setDraftId(draft.id)
		setLastSaved(new Date(draft.updatedAt))
		return draft.data as T
	}, [])

	const discardDraft = useCallback(() => {
		if (draftId) {
			deleteDraft(draftId)
			setDraftId(null)
			setLastSaved(null)
		}
	}, [draftId])

	const clearCurrentDraft = useCallback(() => {
		setDraftId(null)
		setLastSaved(null)
	}, [])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}
		}
	}, [])

	return {
		draftId,
		lastSaved,
		isSaving,
		save,
		debouncedSave,
		loadDraft,
		discardDraft,
		clearCurrentDraft,
		getDrafts: () => getDraftsByKey(key),
	}
}

// Format relative time for "Saved X ago"
export function formatDraftTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	const now = new Date()
	const diff = now.getTime() - d.getTime()

	const seconds = Math.floor(diff / 1000)
	if (seconds < 60) return "just now"

	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`

	const days = Math.floor(hours / 24)
	if (days < 7) return `${days}d ago`

	return d.toLocaleDateString("en-US")
}
