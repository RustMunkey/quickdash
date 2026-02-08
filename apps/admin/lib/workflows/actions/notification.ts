import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { notifications, users } from "@quickdash/db/schema"
import { pusherServer } from "@/lib/pusher-server"
import type {
	ActionHandler,
	NotificationPushConfig,
	NotificationSmsConfig,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

/**
 * Send an in-app push notification
 */
export const handleNotificationPush: ActionHandler<NotificationPushConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	// Resolve variables in config
	const resolved = resolveConfigVariables(config, context)
	const { userId, title, body, link, type = "workflow" } = resolved

	if (!userId) {
		return { success: false, error: "User ID is required for push notification" }
	}

	if (!title) {
		return { success: false, error: "Notification title is required" }
	}

	try {
		// Check if user exists (for test data with fake user IDs)
		const [existingUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!existingUser) {
			// User doesn't exist - log but don't fail the workflow
			// This happens with test data that uses fake user IDs
			console.log(`[Notification] User ${userId} not found, skipping DB insert but broadcasting anyway`)

			// Still broadcast via Pusher (for testing/demo purposes)
			if (pusherServer) {
				await pusherServer.trigger(`user-${userId}`, "notification", {
					id: `test-${Date.now()}`,
					type,
					title,
					body,
					link,
					createdAt: new Date().toISOString(),
				})
			}

			return {
				success: true,
				output: {
					skipped: true,
					reason: "User not found (test mode)",
					userId,
					title,
				},
			}
		}

		// Create notification in database
		const [notification] = await db
			.insert(notifications)
			.values({
				userId,
				workspaceId: context.workspaceId,
				type,
				title,
				body: body || null,
				link: link || null,
				metadata: {
					source: "workflow",
					workflowId: context.workflowId,
					workflowRunId: context.workflowRunId,
				},
			})
			.returning()

		// Broadcast via Pusher if available
		if (pusherServer) {
			await pusherServer.trigger(`user-${userId}`, "notification", {
				id: notification.id,
				type,
				title,
				body,
				link,
				createdAt: notification.createdAt,
			})
		}

		return {
			success: true,
			output: {
				notificationId: notification.id,
				userId,
				title,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send notification",
		}
	}
}

/**
 * Send an SMS notification (placeholder - requires Twilio integration)
 */
export const handleNotificationSms: ActionHandler<NotificationSmsConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	// Resolve variables in config
	const resolved = resolveConfigVariables(config, context)
	const { phoneNumber, message } = resolved

	if (!phoneNumber) {
		return { success: false, error: "Phone number is required for SMS" }
	}

	if (!message) {
		return { success: false, error: "Message is required for SMS" }
	}

	// Check if Twilio is configured
	const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
	const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
	const twilioFromNumber = process.env.TWILIO_FROM_NUMBER

	if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
		return {
			success: false,
			error: "SMS service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
		}
	}

	try {
		// Twilio REST API call
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
				},
				body: new URLSearchParams({
					From: twilioFromNumber,
					To: phoneNumber,
					Body: message,
				}),
			}
		)

		const data = await response.json()

		if (!response.ok) {
			return {
				success: false,
				error: data.message || "Failed to send SMS",
				output: { twilioError: data },
			}
		}

		return {
			success: true,
			output: {
				messageSid: data.sid,
				to: phoneNumber,
				status: data.status,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send SMS",
		}
	}
}
