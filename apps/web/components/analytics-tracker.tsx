"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

function getOrCreateId(key: string): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem("_jb_sid")
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem("_jb_sid", id)
  }
  return id
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  const lastPathRef = useRef<string>("")

  useEffect(() => {
    if (pathname === lastPathRef.current) return
    lastPathRef.current = pathname

    const visitorId = getOrCreateId("_jb_vid")
    const sessionId = getSessionId()

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        visitorId,
        pathname,
        referrer: document.referrer || null,
        hostname: window.location.hostname,
      }),
    }).catch(() => {})
  }, [pathname])

  return null
}
