import { NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { workspaces } from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

export async function GET() {
	try {
		const workspace = await requireWorkspace()

		const [ws] = await db
			.select({
				storageUsedBytes: workspaces.storageUsedBytes,
				maxStorageBytes: workspaces.maxStorageBytes,
			})
			.from(workspaces)
			.where(eq(workspaces.id, workspace.id))
			.limit(1)

		return NextResponse.json({
			usedBytes: ws?.storageUsedBytes ?? 0,
			maxBytes: ws?.maxStorageBytes ?? 0,
		})
	} catch {
		return NextResponse.json({ usedBytes: 0, maxBytes: 0 })
	}
}
