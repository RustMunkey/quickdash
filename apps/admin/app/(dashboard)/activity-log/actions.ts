"use server"

import { db } from "@quickdash/db/client"
import { auditLog } from "@quickdash/db/schema"
import { and, inArray, eq } from "@quickdash/db/drizzle"
import { requireWorkspace } from "@/lib/workspace"

export async function bulkDeleteActivityLogs(ids: string[]) {
	const workspace = await requireWorkspace()
	await db.delete(auditLog).where(and(inArray(auditLog.id, ids), eq(auditLog.workspaceId, workspace.id)))
}
