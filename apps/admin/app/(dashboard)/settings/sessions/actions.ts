"use server"

import { headers } from "next/headers"
import { eq, desc } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { sessions, auditLog } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"

export async function revokeSession(sessionId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) throw new Error("Not authenticated")

  // Get the target session
  const [targetSession] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!targetSession) throw new Error("Session not found")

  // Users can only revoke their own sessions
  if (targetSession.userId !== session.user.id) {
    throw new Error("You can only revoke your own sessions")
  }

  // Don't allow revoking current session (use sign out instead)
  if (targetSession.token === session.session.token) {
    throw new Error("Cannot revoke current session. Use sign out instead.")
  }

  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function getSessionActivity(sessionId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) throw new Error("Not authenticated")

  const entries = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.sessionId, sessionId))
    .orderBy(desc(auditLog.createdAt))
    .limit(50)

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    targetLabel: e.targetLabel,
    createdAt: e.createdAt.toISOString(),
  }))
}
