"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  AddSquareIcon,
  Store01Icon,
  DashboardSquare01Icon,
  InboxIcon,
  GridIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCommandMenu } from "@/components/command-menu"
import { updateSetting, toggleAllProvidersTestMode } from "@/app/(dashboard)/settings/actions"
import { toast } from "sonner"

import { ActiveCallIndicator } from "@/components/calls"
import { FriendRequestsPopover } from "@/components/friend-requests-popover"
import { useToolbar } from "@/components/toolbar"
import { useRightSidebar } from "@/components/ui/right-sidebar"
import { NotificationBell } from "@/components/notifications"
import { useChat } from "@/components/messages"
import { useSidebarMode } from "@/lib/sidebar-mode"

export function HeaderToolbar({ storefrontUrl, initialMaintenanceMode, initialSandboxMode }: { storefrontUrl?: string | null; initialMaintenanceMode?: boolean; initialSandboxMode?: boolean }) {
  const [storeOnline, setStoreOnline] = React.useState(!initialMaintenanceMode)
  const [sandboxMode, setSandboxMode] = React.useState(initialSandboxMode ?? false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [sandboxConfirmOpen, setSandboxConfirmOpen] = React.useState(false)
  const { open: openCommandMenu } = useCommandMenu()
  const router = useRouter()
  const { isOpen: isToolbarOpen, toggleToolbar } = useToolbar()
  const { toggleSidebar: toggleRightSidebar } = useRightSidebar()
  const { mode } = useSidebarMode()
  const isMessagesMode = mode === "messages"
  const { viewMode, toggleViewMode } = useChat()

  return (
    <div className="flex items-center gap-2 px-4">
      {/* Quick create - hide in messages mode */}
      {!isMessagesMode && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <HugeiconsIcon icon={AddSquareIcon} size={16} />
              <span className="sr-only">Quick create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/products?new=true")}>
              Product
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/orders?new=true")}>
              Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/customers?new=true")}>
              Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/marketing?new=true")}>
              Discount
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/content?new=true")}>
              Blog Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Profile/Friends - hide in messages mode */}
      {!isMessagesMode && <FriendRequestsPopover />}

      <ActiveCallIndicator />

      {/* Notifications Bell - hide in messages mode */}
      {!isMessagesMode && <NotificationBell onOpenSidebar={toggleRightSidebar} />}

      {/* Store Menu - hide in messages mode */}
      {!isMessagesMode && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={`size-8 relative ${!storeOnline ? "text-destructive" : ""}`}>
              <HugeiconsIcon icon={Store01Icon} size={16} />
              {!storeOnline && <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />}
              <span className="sr-only">Store</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {storefrontUrl ? (
              <DropdownMenuItem asChild>
                <a href={storefrontUrl.startsWith("http") ? storefrontUrl : `https://${storefrontUrl}`} target="_blank" rel="noopener noreferrer">
                  View Store
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="text-muted-foreground">
                View Store
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
              className={storeOnline ? "text-destructive focus:text-destructive" : ""}
            >
              {storeOnline ? "Turn Off (Maintenance)" : "Bring Back Online"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSandboxConfirmOpen(true)}
              className={sandboxMode ? "text-amber-600 focus:text-amber-600" : ""}
            >
              {sandboxMode ? "Exit Sandbox Mode" : "Enter Sandbox Mode"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {storeOnline ? "Take store offline?" : "Bring store online?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {storeOnline
                ? "Your storefront will be inaccessible to customers. You can bring it back online at any time."
                : "Your storefront will become accessible to customers again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={storeOnline ? "destructive" : "default"}
              onClick={async () => {
                const newOnline = !storeOnline
                try {
                  await updateSetting("maintenance_mode", String(!newOnline), "maintenance")
                  setStoreOnline(newOnline)
                  toast.success(newOnline ? "Store is back online" : "Store is in maintenance mode")
                } catch {
                  toast.error("Failed to update store status")
                }
              }}
            >
              {storeOnline ? "Take Offline" : "Go Online"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sandboxConfirmOpen} onOpenChange={setSandboxConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sandboxMode ? "Exit sandbox mode?" : "Enter sandbox mode?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sandboxMode
                ? "All payment providers will switch back to live credentials. Real payments will be processed."
                : "All payment providers will switch to test/sandbox credentials. No real charges will be made."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const newSandbox = !sandboxMode
                try {
                  await updateSetting("sandbox_mode", String(newSandbox), "sandbox")
                  await toggleAllProvidersTestMode(newSandbox)
                  setSandboxMode(newSandbox)
                  window.dispatchEvent(new CustomEvent("mode-change", { detail: { key: "sandbox_mode", value: newSandbox } }))
                  toast.success(newSandbox ? "Sandbox mode enabled — test payments only" : "Sandbox mode disabled — live payments active")
                  router.refresh()
                } catch {
                  toast.error("Failed to toggle sandbox mode")
                }
              }}
            >
              {sandboxMode ? "Go Live" : "Enter Sandbox"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tools Button - hidden on mobile (widgets don't work well on mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className={`size-8 hidden md:flex ${isToolbarOpen ? "text-primary" : ""}`}
        onClick={toggleToolbar}
        title="Tools (Ctrl+\\ or Cmd+\\)"
      >
        <HugeiconsIcon icon={DashboardSquare01Icon} size={16} />
        <span className="sr-only">Tools</span>
      </Button>

      {/* Chat/Inbox Toggle - only in messages mode */}
      {isMessagesMode && (
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 ${viewMode === "inbox" ? "text-primary" : ""}`}
          onClick={toggleViewMode}
          title={viewMode === "inbox" ? "Show Chat" : "Show Inbox"}
        >
          <HugeiconsIcon icon={viewMode === "inbox" ? GridIcon : InboxIcon} size={16} />
          <span className="sr-only">{viewMode === "inbox" ? "Show Chat" : "Show Inbox"}</span>
        </Button>
      )}

      {/* Search */}
      <button
        type="button"
        onClick={openCommandMenu}
        className="hidden md:flex h-8 w-56 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <HugeiconsIcon icon={Search01Icon} size={14} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-60 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <ThemeToggle />
    </div>
  )
}
