import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { auditLog } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"
import { getActiveWorkspace } from "@/lib/workspace"

type AuditEvent = {
  action: string
  targetType?: string
  targetId?: string
  targetLabel?: string
  metadata?: Record<string, unknown>
  workspaceId?: string // Optional: will auto-detect if not provided
}

export async function logAudit(event: AuditEvent) {
  try {
    const hdrs = await headers()
    const session = await auth.api.getSession({ headers: hdrs })

    if (!session) return

    // Get workspace ID: use explicit value or auto-detect from active workspace
    let workspaceId = event.workspaceId
    if (!workspaceId) {
      try {
        const workspace = await getActiveWorkspace()
        workspaceId = workspace?.id
      } catch {
        // Workspace might not be set (e.g., during onboarding)
      }
    }

    const ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      null

    await db.insert(auditLog).values({
      workspaceId,
      userId: session.user.id,
      sessionId: session.session.id,
      userName: session.user.name,
      userEmail: session.user.email,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      targetLabel: event.targetLabel,
      metadata: event.metadata,
      ipAddress,
    })
  } catch {
    // Audit logging should never break the main flow
    console.error("Failed to write audit log")
  }
}
