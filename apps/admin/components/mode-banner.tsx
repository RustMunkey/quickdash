"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { updateSetting, toggleAllProvidersTestMode } from "@/app/(dashboard)/settings/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// CSS variable name used by the workspace sidebar and layout to offset for the banner
const BANNER_HEIGHT_VAR = "--mode-banner-height"

export function ModeBanner({ initialMaintenanceMode, initialSandboxMode }: { initialMaintenanceMode?: boolean; initialSandboxMode?: boolean }) {
  const [maintenanceMode, setMaintenanceMode] = React.useState(initialMaintenanceMode)
  const [sandboxMode, setSandboxMode] = React.useState(initialSandboxMode)
  const bannerRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Listen for changes from header toolbar
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.key === "maintenance_mode") setMaintenanceMode(e.detail.value)
      if (e.detail.key === "sandbox_mode") setSandboxMode(e.detail.value)
    }
    window.addEventListener("mode-change" as any, handler)
    return () => window.removeEventListener("mode-change" as any, handler)
  }, [])

  // Set a CSS variable on :root so fixed-position elements (workspace sidebar) can offset
  React.useEffect(() => {
    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 0
      document.documentElement.style.setProperty(BANNER_HEIGHT_VAR, `${h}px`)
    }
    update()
    // Re-measure after paint in case fonts/layout shift
    const raf = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.style.setProperty(BANNER_HEIGHT_VAR, "0px")
    }
  }, [maintenanceMode, sandboxMode])

  if (!maintenanceMode && !sandboxMode) return null

  return (
    <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-[60] flex flex-col w-full">
      {sandboxMode && (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-600 dark:text-amber-400">Sandbox Mode</span>
            <span className="text-muted-foreground text-xs sm:text-sm">Test payments are active. No real charges will be processed.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10"
            onClick={async () => {
              try {
                await updateSetting("sandbox_mode", "false", "sandbox")
                await toggleAllProvidersTestMode(false)
                setSandboxMode(false)
                window.dispatchEvent(new CustomEvent("mode-change", { detail: { key: "sandbox_mode", value: false } }))
                toast.success("Sandbox mode disabled")
                router.refresh()
              } catch {
                toast.error("Failed to exit sandbox mode")
              }
            }}
          >
            Exit Sandbox
          </Button>
        </div>
      )}
      {maintenanceMode && (
        <div className="flex items-center justify-between bg-blue-500/15 border-b border-blue-500/30 px-4 py-1.5 text-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-600 dark:text-blue-400">Maintenance Mode</span>
            <span className="text-muted-foreground text-xs sm:text-sm">Your store is offline and inaccessible to customers.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-blue-500/30 hover:bg-blue-500/10"
            onClick={async () => {
              try {
                await updateSetting("maintenance_mode", "false", "maintenance")
                setMaintenanceMode(false)
                window.dispatchEvent(new CustomEvent("mode-change", { detail: { key: "maintenance_mode", value: false } }))
                toast.success("Store is back online")
                router.refresh()
              } catch {
                toast.error("Failed to bring store online")
              }
            }}
          >
            Go Online
          </Button>
        </div>
      )}
    </div>
  )
}
