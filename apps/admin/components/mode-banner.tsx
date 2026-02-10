"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { updateSetting, toggleAllProvidersTestMode } from "@/app/(dashboard)/settings/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ModeBanner({ initialMaintenanceMode, initialSandboxMode }: { initialMaintenanceMode?: boolean; initialSandboxMode?: boolean }) {
  const [maintenanceMode, setMaintenanceMode] = React.useState(initialMaintenanceMode)
  const [sandboxMode, setSandboxMode] = React.useState(initialSandboxMode)
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

  if (!maintenanceMode && !sandboxMode) return null

  return (
    <div className="flex flex-col">
      {sandboxMode && (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-sm">
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
        <div className="flex items-center justify-between bg-blue-500/15 border-b border-blue-500/30 px-4 py-1.5 text-sm">
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
