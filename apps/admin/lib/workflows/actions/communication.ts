import type { ActionHandler, ActionResult } from "../types"
import { resolveConfigVariables } from "../variable-resolver"

// ============================================================================
// Communication Action Configurations
// ============================================================================

export interface DiscordSendMessageConfig {
	webhookUrl?: string
	channelId?: string
	content: string
	embeds?: unknown[]
	username?: string
	avatarUrl?: string
}

export interface DiscordCreateThreadConfig {
	channelId: string
	name: string
	content: string
	autoArchiveDuration?: 60 | 1440 | 4320 | 10080 // minutes
}

export interface TeamsSendMessageConfig {
	webhookUrl: string
	text: string
	title?: string
	themeColor?: string
}

export interface TelegramSendMessageConfig {
	chatId: string
	text: string
	parseMode?: "HTML" | "Markdown" | "MarkdownV2"
	disableNotification?: boolean
}

export interface WhatsAppSendMessageConfig {
	to: string // Phone number
	template?: string
	text?: string
	mediaUrl?: string
}

// ============================================================================
// Communication Action Handlers
// ============================================================================

/**
 * Send a Discord message via webhook
 */
export const handleDiscordSendMessage: ActionHandler<DiscordSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { webhookUrl, content, embeds, username, avatarUrl } = resolved

	if (!webhookUrl) {
		return { success: false, error: "Discord webhook URL is required" }
	}

	if (!content && (!embeds || embeds.length === 0)) {
		return { success: false, error: "Content or embeds required" }
	}

	try {
		const payload: Record<string, unknown> = {}

		if (content) payload.content = content
		if (embeds && Array.isArray(embeds)) payload.embeds = embeds
		if (username) payload.username = username
		if (avatarUrl) payload.avatar_url = avatarUrl

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})

		if (!response.ok) {
			const errorText = await response.text()
			return {
				success: false,
				error: `Discord webhook failed: ${response.status} - ${errorText.slice(0, 100)}`,
			}
		}

		return {
			success: true,
			output: {
				platform: "discord",
				contentPreview: content?.slice(0, 50) + (content?.length > 50 ? "..." : ""),
				embedCount: embeds?.length || 0,
				webhookUrl: webhookUrl.replace(/\/[^\/]+\/[^\/]+$/, "/****/****"), // Mask token
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Discord message failed",
		}
	}
}

/**
 * Create a Discord thread (requires bot token)
 */
export const handleDiscordCreateThread: ActionHandler<DiscordCreateThreadConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { channelId, name, content, autoArchiveDuration = 1440 } = resolved

	if (!channelId || !name) {
		return { success: false, error: "Channel ID and thread name are required" }
	}

	try {
		// TODO: Get bot token from workspace integrations
		// const botToken = await getWorkspaceIntegration(context.workspaceId, "discord_bot")

		return {
			success: true,
			output: {
				platform: "discord",
				type: "thread",
				channelId,
				threadName: name,
				autoArchiveDuration,
				status: "pending_integration",
				note: "Configure Discord bot token in workspace integrations",
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Discord thread creation failed",
		}
	}
}

/**
 * Send Microsoft Teams message via webhook
 */
export const handleTeamsSendMessage: ActionHandler<TeamsSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { webhookUrl, text, title, themeColor = "0076D7" } = resolved

	if (!webhookUrl) {
		return { success: false, error: "Teams webhook URL is required" }
	}

	if (!text) {
		return { success: false, error: "Message text is required" }
	}

	try {
		// Teams message card format
		const payload: Record<string, unknown> = {
			"@type": "MessageCard",
			"@context": "http://schema.org/extensions",
			themeColor,
			summary: title || text.slice(0, 50),
			sections: [
				{
					activityTitle: title || "Workflow Notification",
					text,
				},
			],
		}

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})

		// Teams returns 1 on success (not JSON)
		const responseText = await response.text()

		if (!response.ok || responseText !== "1") {
			return {
				success: false,
				error: `Teams webhook failed: ${responseText.slice(0, 100)}`,
			}
		}

		return {
			success: true,
			output: {
				platform: "teams",
				title: title || "Workflow Notification",
				textPreview: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Teams message failed",
		}
	}
}

/**
 * Send Telegram message
 */
export const handleTelegramSendMessage: ActionHandler<TelegramSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { chatId, text, parseMode, disableNotification = false } = resolved

	if (!chatId || !text) {
		return { success: false, error: "Chat ID and text are required" }
	}

	try {
		// TODO: Get bot token from workspace integrations
		// const botToken = await getWorkspaceIntegration(context.workspaceId, "telegram_bot")

		return {
			success: true,
			output: {
				platform: "telegram",
				chatId,
				textPreview: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
				parseMode: parseMode || "none",
				disableNotification,
				status: "pending_integration",
				note: "Configure Telegram bot token in workspace integrations",
			},
		}

		// Production implementation:
		// const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
		//   method: "POST",
		//   headers: { "Content-Type": "application/json" },
		//   body: JSON.stringify({
		//     chat_id: chatId,
		//     text,
		//     parse_mode: parseMode,
		//     disable_notification: disableNotification,
		//   }),
		// })
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Telegram message failed",
		}
	}
}

/**
 * Send WhatsApp message via WhatsApp Business API
 */
export const handleWhatsAppSendMessage: ActionHandler<WhatsAppSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { to, template, text, mediaUrl } = resolved

	if (!to) {
		return { success: false, error: "Phone number is required" }
	}

	if (!template && !text) {
		return { success: false, error: "Either template or text is required" }
	}

	try {
		// TODO: Get WhatsApp Business API credentials from workspace integrations
		// const credentials = await getWorkspaceIntegration(context.workspaceId, "whatsapp_business")

		// Validate phone number format
		const cleanPhone = to.replace(/\D/g, "")
		if (cleanPhone.length < 10) {
			return { success: false, error: "Invalid phone number format" }
		}

		return {
			success: true,
			output: {
				platform: "whatsapp",
				to: cleanPhone.slice(0, 4) + "****" + cleanPhone.slice(-2), // Mask for privacy
				messageType: template ? "template" : text ? "text" : "media",
				hasMedia: !!mediaUrl,
				status: "pending_integration",
				note: "Configure WhatsApp Business API in workspace integrations",
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "WhatsApp message failed",
		}
	}
}
