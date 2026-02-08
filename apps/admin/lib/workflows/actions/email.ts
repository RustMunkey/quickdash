import { sendEmail, sendTemplateEmail } from "@/lib/send-email"
import type {
	ActionHandler,
	EmailSendConfig,
	EmailSendTemplateConfig,
	WorkflowExecutionContext,
	ActionResult,
} from "../types"
import { resolveConfigVariables } from "../variable-resolver"

/**
 * Send a direct email (no template)
 * Uses workspace-specific email config if available
 */
export const handleEmailSend: ActionHandler<EmailSendConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	// Resolve variables in config
	const resolved = resolveConfigVariables(config, context)
	const { to, subject, body, replyTo } = resolved

	if (!to) {
		return { success: false, error: "Recipient email (to) is required" }
	}

	try {
		const result = await sendEmail({
			to,
			subject,
			html: body,
			replyTo,
			workspaceId: context.workspaceId, // Uses workspace-specific config
		})

		if (!result) {
			return { success: false, error: "Email service not configured" }
		}

		if (result.error) {
			return {
				success: false,
				error: result.error.message,
				output: { errorDetails: result.error },
			}
		}

		return {
			success: true,
			output: {
				messageId: result.data?.id,
				to,
				subject,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send email",
		}
	}
}

/**
 * Send an email using a pre-defined template
 * Uses workspace-specific email config if available
 */
export const handleEmailSendTemplate: ActionHandler<EmailSendTemplateConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	// Resolve variables in config
	const resolved = resolveConfigVariables(config, context)
	const { to, templateSlug, variables = {} } = resolved

	if (!to) {
		return { success: false, error: "Recipient email (to) is required" }
	}

	if (!templateSlug) {
		return { success: false, error: "Template slug is required" }
	}

	try {
		// Get customer ID if available
		const customerId =
			context.customer?.userId ||
			(context.triggerData as unknown as Record<string, unknown>)?.userId as string | undefined

		const result = await sendTemplateEmail({
			to,
			templateSlug,
			variables: variables as Record<string, string>,
			recipientId: customerId,
			workspaceId: context.workspaceId, // Uses workspace-specific config
		})

		if (!result) {
			return {
				success: false,
				error: "Failed to send template email - template may not exist or is inactive",
			}
		}

		if (result.error) {
			return {
				success: false,
				error: result.error.message,
			}
		}

		return {
			success: true,
			output: {
				messageId: result.data?.id,
				to,
				templateSlug,
			},
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send template email",
		}
	}
}
