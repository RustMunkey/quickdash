import { inngest } from "../inngest"
import { pusherServer } from "../pusher-server"
import { wsChannel } from "../pusher-channels"
import {
	markWebhookProcessed,
	updateWebhookStatus,
} from "../webhooks"
import type { ResendWebhookEvent, ResendEmailBounceData } from "../webhooks/resend"

type ResendEventData = {
	webhookEventId: string
	workspaceId: string
	event: ResendWebhookEvent
}

// Process Resend email.delivered webhook
export const processEmailDelivered = inngest.createFunction(
	{ id: "process-email-delivered" },
	{ event: "resend/email.delivered" },
	async ({ event, step }) => {
		const { webhookEventId, workspaceId, event: resendEvent } = event.data as ResendEventData

		const email = resendEvent.data

		await step.run("track-delivery", async () => {
			console.log(`[ws:${workspaceId}] Email ${email.email_id} delivered to ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", `${workspaceId}:${email.email_id}-delivered`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id, workspaceId }
	}
)

// Process Resend email.bounced webhook
export const processEmailBounced = inngest.createFunction(
	{ id: "process-email-bounced" },
	{ event: "resend/email.bounced" },
	async ({ event, step }) => {
		const { webhookEventId, workspaceId, event: resendEvent } = event.data as ResendEventData & {
			event: ResendWebhookEvent & { data: ResendEmailBounceData }
		}

		const email = resendEvent.data

		await step.run("handle-bounce", async () => {
			console.log(`[ws:${workspaceId}] Email to ${email.to[0]} bounced: ${email.bounce.message}`)
		})

		await step.run("notify-team", async () => {
			if (pusherServer && workspaceId) {
				await pusherServer.trigger(wsChannel(workspaceId, "orders"), "email:bounced", {
					emailId: email.email_id,
					to: email.to[0],
					subject: email.subject,
					reason: email.bounce.message,
				})
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", `${workspaceId}:${email.email_id}-bounced`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id, workspaceId }
	}
)

// Process Resend email.complained webhook (spam complaint)
export const processEmailComplained = inngest.createFunction(
	{ id: "process-email-complained" },
	{ event: "resend/email.complained" },
	async ({ event, step }) => {
		const { webhookEventId, workspaceId, event: resendEvent } = event.data as ResendEventData

		const email = resendEvent.data

		await step.run("handle-complaint", async () => {
			console.log(`[ws:${workspaceId}] Spam complaint from ${email.to[0]} for email: ${email.subject}`)
		})

		await step.run("notify-team", async () => {
			if (pusherServer && workspaceId) {
				await pusherServer.trigger(wsChannel(workspaceId, "orders"), "email:complained", {
					emailId: email.email_id,
					to: email.to[0],
					subject: email.subject,
				})
			}
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", `${workspaceId}:${email.email_id}-complained`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id, workspaceId }
	}
)

// Process Resend email.opened webhook
export const processEmailOpened = inngest.createFunction(
	{ id: "process-email-opened" },
	{ event: "resend/email.opened" },
	async ({ event, step }) => {
		const { webhookEventId, workspaceId, event: resendEvent } = event.data as ResendEventData

		const email = resendEvent.data

		await step.run("track-open", async () => {
			console.log(`[ws:${workspaceId}] Email ${email.email_id} opened by ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", `${workspaceId}:${email.email_id}-opened`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id, workspaceId }
	}
)

// Process Resend email.clicked webhook
export const processEmailClicked = inngest.createFunction(
	{ id: "process-email-clicked" },
	{ event: "resend/email.clicked" },
	async ({ event, step }) => {
		const { webhookEventId, workspaceId, event: resendEvent } = event.data as ResendEventData

		const email = resendEvent.data

		await step.run("track-click", async () => {
			console.log(`[ws:${workspaceId}] Link clicked in email ${email.email_id} by ${email.to[0]}`)
		})

		await step.run("mark-processed", async () => {
			await markWebhookProcessed("resend", `${workspaceId}:${email.email_id}-clicked`)
			await updateWebhookStatus(webhookEventId, "processed")
		})

		return { success: true, emailId: email.email_id, workspaceId }
	}
)

export const resendHandlers = [
	processEmailDelivered,
	processEmailBounced,
	processEmailComplained,
	processEmailOpened,
	processEmailClicked,
]
