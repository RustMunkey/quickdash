"use client"

import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarSwipe() {
  const { setOpenMobile, isMobile } = useSidebar()

  React.useEffect(() => {
    if (!isMobile) return

    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch.clientX < 30) {
        startX = touch.clientX
        startY = touch.clientY
        tracking = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)

      if (dx > 60 && dy < 40) {
        setOpenMobile(true)
        tracking = false
      }
    }

    const onTouchEnd = () => {
      tracking = false
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [isMobile, setOpenMobile])

  return null
}
