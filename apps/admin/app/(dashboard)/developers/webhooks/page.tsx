import { desc, eq, and, sql, count } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { webhookEvents } from "@quickdash/db/schema"
import { WebhooksClient } from "./webhooks-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
		provider?: string
		status?: string
	}>
}

export default async function WebhooksPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const pageSize = 25
	const offset = (page - 1) * pageSize

	// Build filters
	const conditions = []
	if (params.provider) {
		conditions.push(eq(webhookEvents.provider, params.provider))
	}
	if (params.status) {
		conditions.push(eq(webhookEvents.status, params.status))
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined

	// Fetch events and count
	const [events, [total], providers] = await Promise.all([
		db
			.select({
				id: webhookEvents.id,
				provider: webhookEvents.provider,
				eventType: webhookEvents.eventType,
				externalId: webhookEvents.externalId,
				status: webhookEvents.status,
				errorMessage: webhookEvents.errorMessage,
				payload: webhookEvents.payload,
				createdAt: webhookEvents.createdAt,
				processedAt: webhookEvents.processedAt,
			})
			.from(webhookEvents)
			.where(where)
			.orderBy(desc(webhookEvents.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(webhookEvents).where(where),
		db
			.selectDistinct({ provider: webhookEvents.provider })
			.from(webhookEvents)
			.orderBy(webhookEvents.provider),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">View incoming webhook events from external services.</p>
			<WebhooksClient
				events={events}
				totalCount={total.count}
				currentPage={page}
				providers={providers.map((p) => p.provider)}
				currentProvider={params.provider}
				currentStatus={params.status}
			/>
		</div>
	)
}
