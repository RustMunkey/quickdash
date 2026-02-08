import type {
	ActionHandler,
	WebhookSendConfig,
	SlackSendMessageConfig,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

// SSRF protection: block requests to internal/private networks
const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254", "[::1]"]

function isUrlAllowed(urlString: string): boolean {
	try {
		const parsed = new URL(urlString)
		// Only allow http/https
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
		// Block known internal hosts
		if (BLOCKED_HOSTS.includes(parsed.hostname)) return false
		// Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
		const ip = parsed.hostname
		if (/^10\./.test(ip)) return false
		if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false
		if (/^192\.168\./.test(ip)) return false
		// Block link-local
		if (/^169\.254\./.test(ip)) return false
		// Block .local/.internal TLDs
		if (ip.endsWith(".local") || ip.endsWith(".internal")) return false
		return true
	} catch {
		return false
	}
}

/**
 * Send a webhook to an external URL
 */
export const handleWebhookSend: ActionHandler<WebhookSendConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { url, method = "POST", headers = {}, body = {} } = resolved

	if (!url) {
		return { success: false, error: "Webhook URL is required" }
	}

	if (!isUrlAllowed(url)) {
		return { success: false, error: "Webhook URL is not allowed: must be a public HTTP/HTTPS URL" }
	}

	try {
		const requestHeaders: Record<string, string> = {
			"Content-Type": "application/json",
			"User-Agent": "Quickdash-Workflow/1.0",
			"X-Workflow-ID": context.workflowId,
			"X-Workflow-Run-ID": context.workflowRunId,
			...(headers as Record<string, string>),
		}

		const requestBody =
			method !== "GET" && method !== "DELETE"
				? JSON.stringify({
						...body,
						_workflow: {
							id: context.workflowId,
							runId: context.workflowRunId,
							trigger: context.trigger,
						},
					})
				: undefined

		const startTime = Date.now()

		const response = await fetch(url, {
			method,
			headers: requestHeaders,
			body: requestBody,
		})

		const duration = Date.now() - startTime
		const responseText = await response.text()

		// Try to parse as JSON
		let responseData: unknown
		try {
			responseData = JSON.parse(responseText)
		} catch {
			responseData = responseText
		}

		if (!response.ok) {
			return {
				success: false,
				error: `Webhook returned ${response.status}: ${responseText.slice(0, 200)}`,
				output: {
					url,
					method,
					statusCode: response.status,
					duration,
					response: responseData,
				},
			}
		}

		return {
			success: true,
			output: {
				url,
				method,
				statusCode: response.status,
				duration,
				response: responseData,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send webhook",
		}
	}
}

/**
 * Send a message to Slack via incoming webhook
 */
export const handleSlackSendMessage: ActionHandler<SlackSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { webhookUrl, message, channel, username, iconEmoji } = resolved

	if (!webhookUrl) {
		return { success: false, error: "Slack webhook URL is required" }
	}

	if (!isUrlAllowed(webhookUrl)) {
		return { success: false, error: "Slack webhook URL is not allowed: must be a public HTTP/HTTPS URL" }
	}

	if (!message) {
		return { success: false, error: "Message is required" }
	}

	try {
		const payload: Record<string, unknown> = {
			text: message,
		}

		// Optional fields
		if (channel) payload.channel = channel
		if (username) payload.username = username
		if (iconEmoji) payload.icon_emoji = iconEmoji

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		})

		const responseText = await response.text()

		// Slack returns "ok" on success
		if (response.ok && responseText === "ok") {
			return {
				success: true,
				output: {
					channel: channel || "default",
					message,
				},
			}
		}

		return {
			success: false,
			error: `Slack webhook failed: ${responseText}`,
			output: {
				statusCode: response.status,
				response: responseText,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send Slack message",
		}
	}
}
