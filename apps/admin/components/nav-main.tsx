"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { useSidebarState } from "@/lib/use-sidebar-state"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

const PREVIOUS_PATH_KEY = "quickdash_messages_previous_path"

export function NavMain({
  label,
  labelIcon,
  items,
}: {
  label: string
  labelIcon?: IconSvgElement
  items: {
    title: string
    url: string
    icon: IconSvgElement
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { openItems, toggle } = useSidebarState()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const pathname = usePathname()

  // Save current path before navigating to messages
  const handleLinkClick = (url: string) => {
    if (url === "/messages" && pathname !== "/messages") {
      sessionStorage.setItem(PREVIOUS_PATH_KEY, pathname)
    }
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {labelIcon && <HugeiconsIcon icon={labelIcon} size={12} className="mr-1.5" />}
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isOpen = openItems.has(item.title)

          return (
            <SidebarMenuItem key={item.title}>
              {item.items?.length ? (
                <>
                  {isCollapsed ? (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url || item.items![0].url} onClick={() => handleLinkClick(item.url || item.items![0].url)}>
                        <HugeiconsIcon icon={item.icon} size={16} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => toggle(item.title)}
                      data-state={isOpen ? "open" : "closed"}
                    >
                      <HugeiconsIcon icon={item.icon} size={16} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                  <SidebarMenuAction
                    className="data-[state=open]:rotate-90 transition-transform duration-200"
                    onClick={() => toggle(item.title)}
                    data-state={isOpen ? "open" : "closed"}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                    <span className="sr-only">Toggle</span>
                  </SidebarMenuAction>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <Link href={subItem.url} onClick={() => handleLinkClick(subItem.url)}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.url} onClick={() => handleLinkClick(item.url)}>
                    <HugeiconsIcon icon={item.icon} size={16} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
