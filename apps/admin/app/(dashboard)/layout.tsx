import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { eq, and, inArray, asc } from "@quickdash/db/drizzle"
import { users, storeSettings, contentCollections } from "@quickdash/db/schema"
import { DynamicFavicon } from "@/components/dynamic-favicon"
import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { CommandMenuWrapper } from "@/components/command-menu-wrapper"
import { HeaderToolbar } from "@/components/header-toolbar"
import { PusherProvider } from "@/components/pusher-provider"
import { CallProvider, IncomingCallModal, CallInterface } from "@/components/calls"
import { MusicPlayerProvider, MusicPlayerLoader } from "@/components/music-player"
import { ToolbarProvider, ToolbarPanel, WidgetPanels } from "@/components/toolbar"
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts"
import { SidebarModeProvider } from "@/lib/sidebar-mode"
import { ChatProvider } from "@/components/messages"
import { WorkspaceSidebarWrapper, SidebarOffsetLayout } from "@/components/workspace-sidebar-wrapper"
import { getUserWorkspaces, getActiveWorkspace } from "@/lib/workspace"
import { SidebarSwipe } from "@/components/sidebar-swipe"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { RightSidebarProvider } from "@/components/ui/right-sidebar"
import { AppRightSidebar } from "@/components/app-right-sidebar"
import { NotificationProvider } from "@/components/notifications/notification-context"
import { UserStatusProvider } from "@/components/user-status-provider"
import { MessageSoundProvider } from "@/components/message-sound-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  // Get fresh user data from database (not session cache)
  let user: { role: string | null; name: string | null; image: string | null; onboardingCompletedAt: Date | null } | undefined
  try {
    const [dbUser] = await db
      .select({
        role: users.role,
        name: users.name,
        image: users.image,
        onboardingCompletedAt: users.onboardingCompletedAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    user = dbUser
  } catch {
    // Database query failed - fall back to session data
    user = undefined
  }

  // If user doesn't exist in DB anymore (e.g. DB was cleared), kill the session
  if (!user) {
    try {
      await auth.api.signOut({ headers: await headers() })
    } catch {}
    redirect("/login")
  }

  // Redirect to onboarding if not completed
  if (!user.onboardingCompletedAt) {
    redirect("/onboarding")
  }

  // Fetch workspace data for the sidebar
  const [workspaces, activeWorkspace] = await Promise.all([
    getUserWorkspaces(),
    getActiveWorkspace(),
  ])

  // Fetch workspace branding if we have an active workspace
  let workspaceFavicon: string | null = null
  let workspaceStoreName: string | null = null
  let workspaceTagline: string | null = null
  let workspaceStorefrontUrl: string | null = null
  let workspaceCustomDomain: string | null = null
  let workspaceMaintenanceMode = false
  if (activeWorkspace?.id) {
    const brandingSettings = await db
      .select({ key: storeSettings.key, value: storeSettings.value })
      .from(storeSettings)
      .where(and(
        eq(storeSettings.workspaceId, activeWorkspace.id),
        inArray(storeSettings.key, ["store_favicon_url", "store_name", "store_tagline", "storefront_url", "custom_domain", "maintenance_mode"])
      ))
    for (const setting of brandingSettings) {
      if (setting.key === "store_favicon_url") workspaceFavicon = setting.value
      if (setting.key === "store_name") workspaceStoreName = setting.value
      if (setting.key === "store_tagline") workspaceTagline = setting.value
      if (setting.key === "storefront_url") workspaceStorefrontUrl = setting.value
      if (setting.key === "custom_domain") workspaceCustomDomain = setting.value
      if (setting.key === "maintenance_mode") workspaceMaintenanceMode = setting.value === "true"
    }
  }

  // Fetch workspace content collections for sidebar
  let collections: { slug: string; name: string; icon: string | null }[] = []
  if (activeWorkspace?.id) {
    collections = await db
      .select({
        slug: contentCollections.slug,
        name: contentCollections.name,
        icon: contentCollections.icon,
      })
      .from(contentCollections)
      .where(
        and(
          eq(contentCollections.workspaceId, activeWorkspace.id),
          eq(contentCollections.isActive, true)
        )
      )
      .orderBy(asc(contentCollections.sortOrder))
  }

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const rightSidebarOpen = cookieStore.get("right_sidebar_state")?.value === "true"

  return (
    <>
    <DynamicFavicon
      faviconUrl={workspaceFavicon}
      storeName={workspaceStoreName}
      tagline={workspaceTagline}
    />
    <PusherProvider
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER}
      workspaceId={activeWorkspace?.id ?? null}
    >
      <MessageSoundProvider userId={session.user.id}>
      <UserStatusProvider>
      <CallProvider
        userId={session.user.id}
        userName={user?.name || session.user.name || "User"}
        userImage={user?.image || null}
      >
        <MusicPlayerProvider>
          <ToolbarProvider>
            <ChatProvider>
              <SidebarModeProvider>
                <WorkspaceSidebarWrapper
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspace?.id ?? null}
                />
                <SidebarOffsetLayout>
                <NotificationProvider userId={session.user.id}>
                <SidebarProvider defaultOpen={sidebarOpen}>
                <RightSidebarProvider defaultOpen={rightSidebarOpen}>
                  <CommandMenuWrapper />
                  <KeyboardShortcutsProvider>
                    <AppSidebar
                      user={{
                        name: user?.name || session.user.name,
                        email: session.user.email,
                        avatar: user?.image || "",
                        role: user?.role || "member",
                      }}
                      workspace={activeWorkspace ? {
                        name: activeWorkspace.name,
                        logo: workspaces.find(w => w.id === activeWorkspace.id)?.logo ?? null,
                        role: activeWorkspace.role,
                      } : null}
                      workspaces={workspaces}
                      activeWorkspaceId={activeWorkspace?.id ?? null}
                      collections={collections}
                      features={activeWorkspace?.features}
                    />
                    <SidebarSwipe />
                    <SidebarInset className="md:flex md:flex-col">
                      <BreadcrumbProvider>
                        <header className="flex h-16 shrink-0 items-center justify-between gap-2">
                          <div className="flex items-center gap-2 px-4 min-w-0">
                            {/* Mobile sidebar trigger */}
                            <SidebarTrigger className="md:hidden" />
                            <div className="min-w-0 overflow-x-auto sm:overflow-hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                              <BreadcrumbNav />
                            </div>
                          </div>
                          <HeaderToolbar storefrontUrl={workspaceCustomDomain || workspaceStorefrontUrl} initialMaintenanceMode={workspaceMaintenanceMode} />
                        </header>
                        {children}
                      </BreadcrumbProvider>
                    </SidebarInset>
                    <AppRightSidebar />
                    {/* Toolbar Panel - needs RightSidebarProvider */}
                    <ToolbarPanel />
                    <WidgetPanels />
                  </KeyboardShortcutsProvider>
                </RightSidebarProvider>
              </SidebarProvider>
              </NotificationProvider>
              </SidebarOffsetLayout>
              </SidebarModeProvider>
            </ChatProvider>

            {/* Music Player - loads user tracks */}
            <MusicPlayerLoader />
          </ToolbarProvider>

          {/* Call UI overlays */}
          <IncomingCallModal />
          <CallInterface />
        </MusicPlayerProvider>
      </CallProvider>
      </UserStatusProvider>
      </MessageSoundProvider>
    </PusherProvider>
    </>
  )
}
