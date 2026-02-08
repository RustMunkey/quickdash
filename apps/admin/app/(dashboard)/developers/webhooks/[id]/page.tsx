import { notFound } from "next/navigation"
import { getWebhookEvent } from "../actions"
import { WebhookDetail } from "./webhook-detail"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function WebhookDetailPage({ params }: PageProps) {
	const { id } = await params
	const event = await getWebhookEvent(id)
	if (!event) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<WebhookDetail event={{
				...event,
				createdAt: event.createdAt.toISOString(),
				processedAt: event.processedAt?.toISOString() ?? null,
			}} />
		</div>
	)
}
