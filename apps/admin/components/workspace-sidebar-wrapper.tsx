"use client"

import * as React from "react"
import { useSidebarMode } from "@/lib/sidebar-mode"
import { useIsMobile } from "@/hooks/use-mobile"
import { WorkspaceSidebar } from "@/components/workspace-sidebar"
import { ServersSidebar } from "@/components/servers-sidebar"
import type { WorkspaceWithRole } from "@/lib/workspace"

const SIDEBAR_WIDTH = 64

// Context to share the offset value with sidebar components
const SidebarOffsetContext = React.createContext<number>(0)

export function useSidebarOffset() {
	return React.useContext(SidebarOffsetContext)
}

interface WorkspaceSidebarWrapperProps {
	workspaces: WorkspaceWithRole[]
	activeWorkspaceId: string | null
}

/**
 * Wrapper that conditionally renders either:
 * - WorkspaceSidebar (when in normal mode - for switching between websites)
 * - ServersSidebar (when in messages mode - for Discord/Slack style team chat)
 *
 * Hidden on mobile - mobile has different navigation patterns
 */
export function WorkspaceSidebarWrapper({ workspaces, activeWorkspaceId }: WorkspaceSidebarWrapperProps) {
	const { mode } = useSidebarMode()
	const isMobile = useIsMobile()

	// Hidden on mobile
	if (isMobile) return null

	return (
		<div className="fixed top-0 left-0 z-50 h-screen overflow-visible">
			{mode === "messages" ? (
				<ServersSidebar />
			) : (
				<WorkspaceSidebar
					workspaces={workspaces}
					activeWorkspaceId={activeWorkspaceId}
				/>
			)}
		</div>
	)
}

/**
 * Provides the sidebar offset context and layout styling
 * This shifts all fixed-positioned sidebars and content
 * Always applies offset on desktop since we always show either workspace or servers sidebar
 */
export function SidebarOffsetLayout({ children }: { children: React.ReactNode }) {
	const isMobile = useIsMobile()
	// Always apply offset on desktop (workspace sidebar or servers sidebar is always visible)
	const offset = isMobile ? 0 : SIDEBAR_WIDTH

	return (
		<SidebarOffsetContext.Provider value={offset}>
			<div
				className="flex flex-1 w-full min-h-svh transition-[padding] duration-200 ease-linear"
				style={{ paddingLeft: offset }}
			>
				{children}
			</div>
		</SidebarOffsetContext.Provider>
	)
}
