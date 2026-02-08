import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { sessions, users, workspaceMembers } from "@quickdash/db/schema"
import { eq, desc, inArray } from "@quickdash/db/drizzle"
import { requireWorkspace } from "@/lib/workspace"
import { SessionsList } from "./sessions-client"

export default async function SessionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return null

  const workspace = await requireWorkspace()

  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const isOwner = currentUser[0]?.role === "owner"

  // If owner, show sessions from workspace members only. Otherwise just their own.
  let allSessions
  if (isOwner) {
    // Get all user IDs in this workspace
    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace.id))

    const memberIds = members.map((m) => m.userId)

    allSessions = memberIds.length > 0
      ? await db
          .select({
            id: sessions.id,
            userId: sessions.userId,
            userName: users.name,
            userEmail: users.email,
            token: sessions.token,
            ipAddress: sessions.ipAddress,
            userAgent: sessions.userAgent,
            expiresAt: sessions.expiresAt,
            createdAt: sessions.createdAt,
          })
          .from(sessions)
          .innerJoin(users, eq(sessions.userId, users.id))
          .where(inArray(sessions.userId, memberIds))
          .orderBy(desc(sessions.createdAt))
          .limit(50)
      : []
  } else {
    allSessions = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userName: users.name,
        userEmail: users.email,
        token: sessions.token,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        expiresAt: sessions.expiresAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.userId, session.user.id))
      .orderBy(desc(sessions.createdAt))
      .limit(50)
  }

  const serialized = allSessions.map((s) => ({
    ...s,
    isCurrent: s.token === session.session.token,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        {isOwner
          ? "Active sessions across all team members."
          : "Your active sessions."}
      </p>
      <SessionsList sessions={serialized} isOwner={isOwner} currentUserId={session.user.id} />
    </div>
  )
}
