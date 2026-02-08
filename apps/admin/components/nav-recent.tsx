"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ReloadIcon } from "@hugeicons/core-free-icons"
import { useRecentPages } from "@/hooks/use-recent-pages"
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
} from "@/components/ui/sidebar"

export function NavRecent() {
	const { recentPages } = useRecentPages()
	const pathname = usePathname()

	// Don't show if no recent pages
	if (recentPages.length === 0) {
		return null
	}

	return (
		<SidebarGroup>
			<SidebarGroupLabel>
				<HugeiconsIcon icon={ReloadIcon} size={12} className="mr-1.5" />
				Recent
			</SidebarGroupLabel>
			<SidebarMenu>
				{recentPages.map((page) => (
					<SidebarMenuItem key={page.path}>
						<SidebarMenuButton
							asChild
							isActive={pathname === page.path}
							tooltip={page.title}
						>
							<Link href={page.path}>
								<span className="truncate">{page.title}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
