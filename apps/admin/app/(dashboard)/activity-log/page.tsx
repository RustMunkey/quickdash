import { db } from "@quickdash/db/client"
import { auditLog } from "@quickdash/db/schema"
import { desc, count, eq } from "@quickdash/db/drizzle"
import { ActivityLogClient } from "./activity-log-client"
import { requireWorkspace } from "@/lib/workspace"

interface PageProps {
	searchParams: Promise<{
		page?: string
	}>
}

export default async function ActivityLogPage({ searchParams }: PageProps) {
	const workspace = await requireWorkspace()
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const offset = (page - 1) * pageSize

	// Filter by workspace to ensure proper data isolation
	const workspaceFilter = eq(auditLog.workspaceId, workspace.id)

	const [entries, [total]] = await Promise.all([
		db
			.select({
				id: auditLog.id,
				userName: auditLog.userName,
				userEmail: auditLog.userEmail,
				action: auditLog.action,
				targetType: auditLog.targetType,
				targetId: auditLog.targetId,
				targetLabel: auditLog.targetLabel,
				createdAt: auditLog.createdAt,
			})
			.from(auditLog)
			.where(workspaceFilter)
			.orderBy(desc(auditLog.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(auditLog).where(workspaceFilter),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Recent actions across the admin panel.
			</p>

			<ActivityLogClient
				entries={entries}
				totalCount={Number(total.count)}
				currentPage={page}
			/>
		</div>
	)
}
