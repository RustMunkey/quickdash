"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useBreadcrumbOverrides } from "@/components/breadcrumb-context"
import { useSidebarMode } from "@/lib/sidebar-mode"
import { useChat } from "@/components/messages"
import Link from "next/link"

const labels: Record<string, string> = {
  analytics: "Analytics",
  sales: "Sales",
  traffic: "Traffic",
  customers: "Customers",
  "customer-insights": "Customer Insights",
  orders: "Orders",
  returns: "Returns & Refunds",
  fulfillment: "Fulfillment",
  notes: "Notes & Bugs",
  products: "Products",
  categories: "Categories",
  variants: "Variants",
  reviews: "Reviews",
  pending: "Pending",
  reported: "Reported",
  segments: "Segments",
  loyalty: "Loyalty & Rewards",
  "gift-cards": "Gift Cards",
  inventory: "Inventory",
  alerts: "Alerts",
  activity: "Activity Log",
  subscriptions: "Subscriptions",
  paused: "Paused",
  canceled: "Canceled",
  dunning: "Dunning",
  shipping: "Shipping",
  zones: "Zones",
  labels: "Labels",
  tracking: "Tracking",
  marketing: "Marketing",
  campaigns: "Campaigns",
  referrals: "Referrals",
  seo: "SEO",
  content: "Content",
  pages: "Pages",
  media: "Media Library",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase Orders",
  automation: "Automation",
  triggers: "Triggers",
  history: "History",
  notifications: "Notifications",
  "activity-log": "Activity Log",
  settings: "Settings",
  team: "Team & Permissions",
  payments: "Payments",
  tax: "Tax",
  integrations: "Integrations",
  account: "Account",
  sessions: "Sessions",
  storefronts: "Storefronts",
  messages: "Messages",
  calls: "Calls",
  auctions: "Auctions",
  drafts: "Drafts",
  closed: "Closed",
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  pipeline: "Pipeline",
  tasks: "Tasks",
  billing: "Billing",
  invoices: "Invoices",
  "payment-methods": "Payment Methods",
  usage: "Usage",
  "email-templates": "Email Templates",
  developers: "Developers",
  "api-keys": "API Keys",
  webhooks: "Webhooks",
  test: "Test Page",
  new: "New",
  scheduling: "Scheduling",
  profile: "Profile",
}

function toTitleCase(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const overrides = useBreadcrumbOverrides()
  const { mode } = useSidebarMode()
  const chat = useChat()
  const segments = pathname.split("/").filter(Boolean)

  // Messages mode - show active conversation
  if (mode === "messages") {
    const conversationLabel = chat.active.type === "channel"
      ? `#${chat.active.id}`
      : chat.active.label

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbPage>Messages</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="whitespace-nowrap sm:truncate">
              {conversationLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/")
          const label = labels[segment] || toTitleCase(segment)
          const isLast = index === segments.length - 1

          const isId = !labels[segment] && index > 0
          const displayLabel = overrides[segment] || (isId ? segment : label)

          return (
            <React.Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className={isLast ? "min-w-0" : "shrink-0"}>
                {isLast ? (
                  <BreadcrumbPage className="whitespace-nowrap sm:truncate">{displayLabel}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{displayLabel}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
