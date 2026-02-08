"use client"

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react"

const STORAGE_KEY = "quickdash_sidebar_state"
const SCROLL_KEY = "quickdash_sidebar_scroll"

type SidebarStateContextValue = {
  openItems: Set<string>
  toggle: (title: string) => void
  collapseAll: () => void
  scrollPosition: number
  setScrollPosition: (pos: number) => void
}

export const SidebarStateContext = createContext<SidebarStateContextValue>({
  openItems: new Set(),
  toggle: () => {},
  collapseAll: () => {},
  scrollPosition: 0,
  setScrollPosition: () => {},
})

function loadFromLocalStorage(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveToLocalStorage(items: Set<string>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)))
  } catch {}
}

function loadScrollPosition(): number {
  if (typeof window === "undefined") return 0
  try {
    return Number(localStorage.getItem(SCROLL_KEY)) || 0
  } catch {
    return 0
  }
}

function saveScrollPosition(pos: number) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SCROLL_KEY, String(pos))
  } catch {}
}

export function useSidebarStateProvider() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["Dashboard"]))
  const [loaded, setLoaded] = useState(false)
  const [useLocalStorage, setUseLocalStorage] = useState(false)
  const [scrollPosition, setScrollPositionState] = useState(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved state on mount
  useEffect(() => {
    // First try API (Redis), fall back to localStorage
    fetch("/api/sidebar-state")
      .then((res) => res.json())
      .then((data) => {
        if (data.useLocalStorage) {
          setUseLocalStorage(true)
          const local = loadFromLocalStorage()
          if (local.length) {
            setOpenItems(new Set(local))
          }
        } else if (data.openItems?.length) {
          setOpenItems(new Set(data.openItems))
        }
        setLoaded(true)
      })
      .catch(() => {
        // API failed, use localStorage
        setUseLocalStorage(true)
        const local = loadFromLocalStorage()
        if (local.length) {
          setOpenItems(new Set(local))
        }
        setLoaded(true)
      })

    // Load scroll position from localStorage
    setScrollPositionState(loadScrollPosition())
  }, [])

  // Debounced save
  const save = useCallback((items: Set<string>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      // Always save to localStorage as backup
      saveToLocalStorage(items)
      // Also try API if available
      if (!useLocalStorage) {
        fetch("/api/sidebar-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ openItems: Array.from(items) }),
        }).catch(() => {})
      }
    }, 500)
  }, [useLocalStorage])

  const toggle = useCallback((title: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      save(next)
      return next
    })
  }, [save])

  const collapseAll = useCallback(() => {
    const empty = new Set<string>()
    setOpenItems(empty)
    save(empty)
  }, [save])

  const setScrollPosition = useCallback((pos: number) => {
    setScrollPositionState(pos)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      saveScrollPosition(pos)
    }, 200)
  }, [])

  return { openItems, toggle, collapseAll, loaded, scrollPosition, setScrollPosition }
}

export function useSidebarState() {
  return useContext(SidebarStateContext)
}
