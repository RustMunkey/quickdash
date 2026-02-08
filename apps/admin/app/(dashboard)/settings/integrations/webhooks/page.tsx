import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { users } from "@quickdash/db/schema"
import { WebhooksClient } from "./webhooks-client"
import {
	getIncomingWebhooks,
	getOutgoingWebhooks,
	getDeliveryLogs,
} from "./actions"

export default async function WebhooksPage() {
	const session = await auth.api.getSession({ headers: await headers() })

	if (!session) {
		redirect("/login")
	}

	// Only owners can access webhooks
	const [user] = await db
		.select({ role: users.role })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	if (user?.role !== "owner") {
		redirect("/settings")
	}

	const [incomingWebhooks, outgoingWebhooks, deliveryLogs] = await Promise.all([
		getIncomingWebhooks(),
		getOutgoingWebhooks(),
		getDeliveryLogs({ pageSize: 25 }),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<WebhooksClient
				incomingWebhooks={incomingWebhooks}
				outgoingWebhooks={outgoingWebhooks}
				deliveryLogs={deliveryLogs}
			/>
		</div>
	)
}
