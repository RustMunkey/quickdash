"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon } from "@hugeicons/react"
import { SidebarRight01Icon } from "@hugeicons/core-free-icons"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const RIGHT_SIDEBAR_COOKIE_NAME = "right_sidebar_state"
const RIGHT_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const RIGHT_SIDEBAR_WIDTH = "16rem"
const RIGHT_SIDEBAR_WIDTH_MOBILE = "min(85vw, 16rem)"

type RightSidebarContextProps = {
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const RightSidebarContext = React.createContext<RightSidebarContextProps | null>(null)

function useRightSidebar() {
  const context = React.useContext(RightSidebarContext)
  if (!context) {
    throw new Error("useRightSidebar must be used within a RightSidebarProvider.")
  }
  return context
}

function RightSidebarProvider({
  defaultOpen = false,
  open: openProp,
  onOpenChange: setOpenProp,
  children,
}: {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }
      document.cookie = `${RIGHT_SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${RIGHT_SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  const contextValue = React.useMemo<RightSidebarContextProps>(
    () => ({
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <RightSidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </RightSidebarContext.Provider>
  )
}

function RightSidebar({
  variant = "inset",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "sidebar" | "floating" | "inset"
}) {
  const { isMobile, open, openMobile, setOpenMobile } = useRightSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="right-sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--right-sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--right-sidebar-width": RIGHT_SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Right Sidebar</SheetTitle>
            <SheetDescription>Displays the right sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={open ? "open" : "closed"}
      data-variant={variant}
      data-side="right"
      data-slot="right-sidebar"
      style={
        {
          "--right-sidebar-width": RIGHT_SIDEBAR_WIDTH,
        } as React.CSSProperties
      }
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="right-sidebar-gap"
        className={cn(
          "relative w-(--right-sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
          !open && "w-0",
          variant === "floating" || variant === "inset"
            ? ""
            : ""
        )}
      />
      <div
        data-slot="right-sidebar-container"
        className={cn(
          "fixed inset-y-0 right-0 z-10 hidden h-svh w-(--right-sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
          open ? "right-0" : "right-[calc(var(--right-sidebar-width)*-1)]",
          (variant === "floating" || variant === "inset") && "p-2",
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="right-sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function RightSidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useRightSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="right-sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <HugeiconsIcon icon={SidebarRight01Icon} size={18} />
      <span className="sr-only">Toggle Right Sidebar</span>
    </Button>
  )
}

function RightSidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="right-sidebar-header"
      data-sidebar="header"
      className={cn(
        "flex flex-col gap-2 p-2 sticky top-0 z-10 backdrop-blur-xl backdrop-saturate-150 border-b border-sidebar-border/30 bg-[color-mix(in_oklch,var(--sidebar)_80%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

function RightSidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="right-sidebar-footer"
      data-sidebar="footer"
      className={cn(
        "flex flex-col gap-2 p-2 sticky bottom-0 z-10 backdrop-blur-xl backdrop-saturate-150 border-t border-sidebar-border/30 bg-[color-mix(in_oklch,var(--sidebar)_80%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

function RightSidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="right-sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  )
}

function RightSidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="right-sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

function RightSidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="right-sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
}

function RightSidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      data-slot="right-sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function RightSidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="right-sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function RightSidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="right-sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function RightSidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="right-sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

const rightSidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function RightSidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof rightSidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button"
  const { isMobile } = useRightSidebar()

  const button = (
    <Comp
      data-slot="right-sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(rightSidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="left"
        align="center"
        hidden={isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function RightSidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="right-sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  )
}

function RightSidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      data-slot="right-sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

export {
  RightSidebar,
  RightSidebarContent,
  RightSidebarFooter,
  RightSidebarGroup,
  RightSidebarGroupContent,
  RightSidebarGroupLabel,
  RightSidebarHeader,
  RightSidebarInput,
  RightSidebarMenu,
  RightSidebarMenuButton,
  RightSidebarMenuItem,
  RightSidebarMenuSkeleton,
  RightSidebarProvider,
  RightSidebarSeparator,
  RightSidebarTrigger,
  useRightSidebar,
}
