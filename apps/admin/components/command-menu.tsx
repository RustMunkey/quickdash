"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { globalSearch, searchFriends, type SearchResult } from "@/app/(dashboard)/search-actions"

const pages = [
  { title: "Dashboard", url: "/" },
  { title: "Analytics", url: "/analytics" },
  { title: "Sales Reports", url: "/analytics/sales" },
  { title: "Traffic", url: "/analytics/traffic" },
  { title: "Customer Insights", url: "/analytics/customers" },
  { title: "Subscription Analytics", url: "/analytics/subscriptions" },
  { title: "Orders", url: "/orders" },
  { title: "Returns & Refunds", url: "/orders/returns" },
  { title: "Fulfillment", url: "/orders/fulfillment" },
  { title: "Products", url: "/products" },
  { title: "Categories", url: "/products/categories" },
  { title: "Variants", url: "/products/variants" },
  { title: "Reviews", url: "/reviews" },
  { title: "Pending Reviews", url: "/reviews/pending" },
  { title: "Reported Reviews", url: "/reviews/reported" },
  { title: "Customers", url: "/customers" },
  { title: "Segments", url: "/customers/segments" },
  { title: "Loyalty & Rewards", url: "/customers/loyalty" },
  { title: "Gift Cards", url: "/customers/gift-cards" },
  { title: "Inventory", url: "/inventory" },
  { title: "Inventory Alerts", url: "/inventory/alerts" },
  { title: "Activity Log", url: "/inventory/activity" },
  { title: "Subscriptions", url: "/subscriptions" },
  { title: "Paused Subscriptions", url: "/subscriptions/paused" },
  { title: "Canceled Subscriptions", url: "/subscriptions/canceled" },
  { title: "Dunning", url: "/subscriptions/dunning" },
  { title: "Shipping", url: "/shipping" },
  { title: "Zones", url: "/shipping/zones" },
  { title: "Labels", url: "/shipping/labels" },
  { title: "Tracking", url: "/shipping/tracking" },
  { title: "Suppliers", url: "/suppliers" },
  { title: "Purchase Orders", url: "/suppliers/purchase-orders" },
  { title: "Marketing", url: "/marketing" },
  { title: "Campaigns", url: "/marketing/campaigns" },
  { title: "Referrals", url: "/marketing/referrals" },
  { title: "SEO", url: "/marketing/seo" },
  { title: "Email Templates", url: "/marketing/email-templates" },
  { title: "Content", url: "/content" },
  { title: "Pages", url: "/content/pages" },
  { title: "Media Library", url: "/content/media" },
  { title: "Auctions", url: "/auctions" },
  { title: "Messages", url: "/messages" },
  { title: "Discover People", url: "/discover" },
  { title: "Notifications", url: "/notifications" },
  { title: "Notification Alerts", url: "/notifications/alerts" },
  { title: "Activity Log", url: "/activity-log" },
  { title: "Automation", url: "/automation" },
  { title: "Automation Triggers", url: "/automation/triggers" },
  { title: "Automation History", url: "/automation/history" },
  { title: "Sales Pipeline", url: "/sales/pipeline" },
  { title: "Sales Contacts", url: "/sales/contacts" },
  { title: "Sales Companies", url: "/sales/companies" },
  { title: "Sales Deals", url: "/sales/deals" },
  { title: "Sales Tasks", url: "/sales/tasks" },
  { title: "Sales Calls", url: "/sales/calls" },
  { title: "Billing", url: "/billing" },
  { title: "Developer Notes", url: "/developers/notes" },
  { title: "API Keys", url: "/developers/api-keys" },
  { title: "Webhooks", url: "/developers/webhooks" },
  { title: "Settings", url: "/settings" },
  { title: "Account", url: "/settings/account" },
  { title: "Notification Preferences", url: "/settings/notifications" },
  { title: "Team & Permissions", url: "/settings/team" },
  { title: "Payments", url: "/settings/payments" },
  { title: "Tax", url: "/settings/tax" },
  { title: "Shipping Settings", url: "/settings/shipping" },
  { title: "Integrations", url: "/settings/integrations" },
  { title: "Storefronts", url: "/settings/storefronts" },
  { title: "Sessions", url: "/settings/sessions" },
  { title: "Data Exports", url: "/settings/exports" },
]

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<{
    products: SearchResult[]
    orders: SearchResult[]
    customers: SearchResult[]
  }>({ products: [], orders: [], customers: [] })
  const [friends, setFriends] = React.useState<SearchResult[]>([])
  const [searching, setSearching] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme } = useTheme()
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  const isMessagesPage = pathname?.startsWith("/messages")

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    const openFromButton = () => setOpen(true)
    document.addEventListener("keydown", down)
    document.addEventListener("open-command-menu", openFromButton)
    return () => {
      document.removeEventListener("keydown", down)
      document.removeEventListener("open-command-menu", openFromButton)
    }
  }, [])

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setResults({ products: [], orders: [], customers: [] })
      setFriends([])
    }
  }, [open])

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.length < 2) {
      setResults({ products: [], orders: [], customers: [] })
      setFriends([])
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const [searchResults, friendResults] = await Promise.all([
          globalSearch(query),
          isMessagesPage ? searchFriends(query) : Promise.resolve([]),
        ])
        setResults(searchResults)
        setFriends(friendResults)
      } catch {
        // Ignore search errors
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isMessagesPage])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={isMessagesPage ? "Search messages, friends, pages..." : "Search products, orders, customers, pages..."}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Friends - contextual to messages page */}
        {friends.length > 0 && (
          <>
            <CommandGroup heading="Friends">
              {friends.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`friend-${item.title}-${item.subtitle || ""}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <span>{item.title}</span>
                  {item.subtitle && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Products */}
        {results.products.length > 0 && (
          <>
            <CommandGroup heading="Products">
              {results.products.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`product-${item.title}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Orders */}
        {results.orders.length > 0 && (
          <>
            <CommandGroup heading="Orders">
              {results.orders.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`order-${item.title}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <span>{item.title}</span>
                  {item.subtitle && (
                    <span className="ml-2 text-xs text-muted-foreground capitalize">{item.subtitle}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Customers / Team */}
        {results.customers.length > 0 && (
          <>
            <CommandGroup heading="People">
              {results.customers.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`person-${item.title}-${item.subtitle || ""}`}
                  onSelect={() => runCommand(() => router.push(item.url))}
                >
                  <span>{item.title}</span>
                  {item.subtitle && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Pages - always show, filtered by cmdk */}
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.url}
              value={`page-${page.title}`}
              onSelect={() => runCommand(() => router.push(page.url))}
            >
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            value="action-create-product"
            onSelect={() => runCommand(() => router.push("/products?new=true"))}
          >
            Create Product
          </CommandItem>
          <CommandItem
            value="action-create-order"
            onSelect={() => runCommand(() => router.push("/orders?new=true"))}
          >
            Create Order
          </CommandItem>
          <CommandItem
            value="action-create-customer"
            onSelect={() => runCommand(() => router.push("/customers?new=true"))}
          >
            Create Customer
          </CommandItem>
          <CommandItem
            value="action-light-mode"
            onSelect={() => runCommand(() => setTheme("light"))}
          >
            Light Mode
          </CommandItem>
          <CommandItem
            value="action-dark-mode"
            onSelect={() => runCommand(() => setTheme("dark"))}
          >
            Dark Mode
          </CommandItem>
          <CommandItem
            value="action-system-theme"
            onSelect={() => runCommand(() => setTheme("system"))}
          >
            System Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandMenu() {
  return {
    open: () => {
      document.dispatchEvent(new Event("open-command-menu"))
    },
  }
}
