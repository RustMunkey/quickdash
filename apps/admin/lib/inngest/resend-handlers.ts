import { inngest } from "../inngest"
import { pusherServer } from "../pusher-server"
import { wsChannel } from "../pusher-channels"
import { db } from "@quickdash/db"
import { workspaces } from "@quickdash/db/schema"
import {
	markWebhookProcessed,
	updateWebhookStatus,
} from "../webhooks"
import type { ResendWebhookEvent, ResendEmailBounceData } from "../webhooks/resend"

// Process Resend email.delivered webhook
export const processEmailDelivered = inngest.createFunction(
	{ id: "process-email-delivered" },
	{ event: "resend/email.delivered" },
	async ({ event, step }) => {
		const { webhookEventId, event: resendEvent } = event.data as {
			webhookEventId: string
			event: ResendWebhookEvent
		}

		const email = resendEvent.data

		await step.run("track-delivery", async () => {
			// TODO: Update email tracking record
			console.log(`Email ${email.email_id} delivered to ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", email.email_id + "-delivered")
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id }
	}
)

// Process Resend email.bounced webhook
export const processEmailBounced = inngest.createFunction(
	{ id: "process-email-bounced" },
	{ event: "resend/email.bounced" },
	async ({ event, step }) => {
		const { webhookEventId, event: resendEvent } = event.data as {
			webhookEventId: string
			event: ResendWebhookEvent & { data: ResendEmailBounceData }
		}

		const email = resendEvent.data

		await step.run("handle-bounce", async () => {
			// TODO: Mark email address as bounced
			// TODO: Potentially disable email notifications for this address
			console.log(`Email to ${email.to[0]} bounced: ${email.bounce.message}`)
		})

		await step.run("notify-team", async () => {
			// Alert team about bounced email
			if (pusherServer) {
				const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
				if (workspace) {
					await pusherServer.trigger(wsChannel(workspace.id, "orders"), "email:bounced", {
						emailId: email.email_id,
						to: email.to[0],
						subject: email.subject,
						reason: email.bounce.message,
					})
				}
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", email.email_id + "-bounced")
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id }
	}
)

// Process Resend email.complained webhook (spam complaint)
export const processEmailComplained = inngest.createFunction(
	{ id: "process-email-complained" },
	{ event: "resend/email.complained" },
	async ({ event, step }) => {
		const { webhookEventId, event: resendEvent } = event.data as {
			webhookEventId: string
			event: ResendWebhookEvent
		}

		const email = resendEvent.data

		await step.run("handle-complaint", async () => {
			// TODO: Mark email address as complained (unsubscribe from all marketing)
			// This is serious - spam complaints can affect deliverability
			console.log(`Spam complaint from ${email.to[0]} for email: ${email.subject}`)
		})

		await step.run("notify-team", async () => {
			// Alert team about spam complaint
			if (pusherServer) {
				const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
				if (workspace) {
					await pusherServer.trigger(wsChannel(workspace.id, "orders"), "email:complained", {
						emailId: email.email_id,
						to: email.to[0],
						subject: email.subject,
					})
				}
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", email.email_id + "-complained")
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id }
	}
)

// Process Resend email.opened webhook
export const processEmailOpened = inngest.createFunction(
	{ id: "process-email-opened" },
	{ event: "resend/email.opened" },
	async ({ event, step }) => {
		const { webhookEventId, event: resendEvent } = event.data as {
			webhookEventId: string
			event: ResendWebhookEvent
		}

		const email = resendEvent.data

		await step.run("track-open", async () => {
			// TODO: Update email tracking record with open timestamp
			console.log(`Email ${email.email_id} opened by ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", email.email_id + "-opened")
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id }
	}
)

// Process Resend email.clicked webhook
export const processEmailClicked = inngest.createFunction(
	{ id: "process-email-clicked" },
	{ event: "resend/email.clicked" },
	async ({ event, step }) => {
		const { webhookEventId, event: resendEvent } = event.data as {
			webhookEventId: string
			event: ResendWebhookEvent
		}

		const email = resendEvent.data

		await step.run("track-click", async () => {
			// TODO: Update email tracking record with click data
			console.log(`Link clicked in email ${email.email_id} by ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", email.email_id + "-clicked")
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id }
	}
)

export const resendHandlers = [
	processEmailDelivered,
	processEmailBounced,
	processEmailComplained,
	processEmailOpened,
	processEmailClicked,
]
