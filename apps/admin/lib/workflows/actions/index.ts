import type { WorkflowAction } from "@quickdash/db/schema"
import type {
	ActionHandler,
	ActionConfig,
	WorkflowExecutionContext,
	ActionResult,
} from "../types"

// Import all action handlers
import { handleEmailSend, handleEmailSendTemplate } from "./email"
import { handleNotificationPush, handleNotificationSms } from "./notification"
import {
	handleCustomerAddTag,
	handleCustomerRemoveTag,
	handleCustomerUpdateField,
} from "./customer"
import { handleOrderAddNote, handleOrderUpdateStatus } from "./order"
import { handleProductUpdateStock } from "./product"
import { handleWebhookSend, handleSlackSendMessage } from "./integrations"

// AI actions
import {
	handleAiGenerateText,
	handleAiAnalyzeSentiment,
	handleAiCategorize,
	handleAiTranslate,
	handleAiSummarize,
} from "./ai"

// Social media actions
import {
	handleTwitterPost,
	handleTwitterDm,
	handleFacebookPost,
	handleFacebookMessage,
	handleInstagramPost,
	handleInstagramStory,
	handleLinkedInPost,
	handleTikTokPost,
	handlePinterestPin,
	handleThreadsPost,
} from "./social"

// Communication actions
import {
	handleDiscordSendMessage,
	handleDiscordCreateThread,
	handleTeamsSendMessage,
	handleTelegramSendMessage,
	handleWhatsAppSendMessage,
} from "./communication"

// Productivity actions (Google, Microsoft, Notion, etc.)
import {
	handleGoogleSheetsAddRow,
	handleGoogleSheetsUpdateRow,
	handleGoogleDocsCreate,
	handleGoogleSlidesCreate,
	handleGoogleDriveUpload,
	handleGoogleDriveCreateFolder,
	handleGoogleCalendarCreateEvent,
	handleGmailSend,
	handleOutlookSendEmail,
	handleExcelAddRow,
	handleWordCreateDoc,
	handlePowerPointCreate,
	handleOneDriveUpload,
	handleMicrosoftTodoCreate,
	handleNotionCreatePage,
	handleNotionUpdateDatabase,
	handleAirtableCreateRecord,
	handleTrelloCreateCard,
	handleAsanaCreateTask,
	handleMondayCreateItem,
	handleClickUpCreateTask,
	handleJiraCreateIssue,
	handleLinearCreateIssue,
} from "./productivity"

// Infrastructure actions (GitHub, Cloudflare, AWS, etc.)
import {
	handleGitHubCreateIssue,
	handleGitHubCreatePrComment,
	handleGitHubTriggerWorkflow,
	handleGitHubCreateRelease,
	handleCloudflarePurgeCache,
	handleCloudflareCreateDnsRecord,
	handleCloudflareR2Upload,
	handleAwsS3Upload,
	handleAwsSnsPublish,
	handleAwsSqsSendMessage,
	handleAwsLambdaInvoke,
	handleAwsSesSendEmail,
	handleVercelDeploy,
	handleVercelRedeploy,
	handleNetlifyTriggerBuild,
} from "./infrastructure"

// CRM & E-commerce actions
import {
	handleHubSpotCreateContact,
	handleHubSpotCreateDeal,
	handleSalesforceCreateLead,
	handlePipedriveCreateDeal,
	handleZendeskCreateTicket,
	handleIntercomSendMessage,
	handleFreshdeskCreateTicket,
	handleShopifyCreateOrder,
	handleStripeCreateInvoice,
	handleMailchimpAddSubscriber,
	handleKlaviyoAddProfile,
	handleSendGridSendEmail,
	handleSegmentTrack,
	handleMixpanelTrack,
	handlePostHogCapture,
} from "./crm"

/**
 * Registry mapping action types to their handlers
 * Using ActionHandler<ActionConfig> as the base type - individual handlers
 * are strongly typed via their specific config interfaces
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_HANDLERS: Record<string, ActionHandler<any>> = {
	// ========================================
	// Email actions
	// ========================================
	"email.send": handleEmailSend,
	"email.send_template": handleEmailSendTemplate,

	// ========================================
	// Notification actions
	// ========================================
	"notification.push": handleNotificationPush,
	"notification.sms": handleNotificationSms,

	// ========================================
	// Data actions
	// ========================================
	"customer.add_tag": handleCustomerAddTag,
	"customer.remove_tag": handleCustomerRemoveTag,
	"customer.update_field": handleCustomerUpdateField,
	"order.add_note": handleOrderAddNote,
	"order.update_status": handleOrderUpdateStatus,
	"product.update_stock": handleProductUpdateStock,

	// ========================================
	// AI & Bot actions
	// ========================================
	"ai.generate_text": handleAiGenerateText,
	"ai.analyze_sentiment": handleAiAnalyzeSentiment,
	"ai.categorize": handleAiCategorize,
	"ai.translate": handleAiTranslate,
	"ai.summarize": handleAiSummarize,

	// ========================================
	// Social Media actions
	// ========================================
	"twitter.post": handleTwitterPost,
	"twitter.dm": handleTwitterDm,
	"facebook.post": handleFacebookPost,
	"facebook.message": handleFacebookMessage,
	"instagram.post": handleInstagramPost,
	"instagram.story": handleInstagramStory,
	"linkedin.post": handleLinkedInPost,
	"tiktok.post": handleTikTokPost,
	"pinterest.pin": handlePinterestPin,
	"threads.post": handleThreadsPost,

	// ========================================
	// Communication actions
	// ========================================
	"slack.send_message": handleSlackSendMessage,
	"discord.send_message": handleDiscordSendMessage,
	"discord.create_thread": handleDiscordCreateThread,
	"teams.send_message": handleTeamsSendMessage,
	"telegram.send_message": handleTelegramSendMessage,
	"whatsapp.send_message": handleWhatsAppSendMessage,

	// ========================================
	// Google Suite actions
	// ========================================
	"google_sheets.add_row": handleGoogleSheetsAddRow,
	"google_sheets.update_row": handleGoogleSheetsUpdateRow,
	"google_docs.create": handleGoogleDocsCreate,
	"google_slides.create": handleGoogleSlidesCreate,
	"google_drive.upload": handleGoogleDriveUpload,
	"google_drive.create_folder": handleGoogleDriveCreateFolder,
	"google_calendar.create_event": handleGoogleCalendarCreateEvent,
	"gmail.send": handleGmailSend,

	// ========================================
	// Microsoft Suite actions
	// ========================================
	"outlook.send_email": handleOutlookSendEmail,
	"excel.add_row": handleExcelAddRow,
	"word.create_doc": handleWordCreateDoc,
	"powerpoint.create": handlePowerPointCreate,
	"onedrive.upload": handleOneDriveUpload,
	"microsoft_todo.create_task": handleMicrosoftTodoCreate,

	// ========================================
	// Productivity actions
	// ========================================
	"notion.create_page": handleNotionCreatePage,
	"notion.update_database": handleNotionUpdateDatabase,
	"airtable.create_record": handleAirtableCreateRecord,
	"trello.create_card": handleTrelloCreateCard,
	"asana.create_task": handleAsanaCreateTask,
	"monday.create_item": handleMondayCreateItem,
	"clickup.create_task": handleClickUpCreateTask,
	"jira.create_issue": handleJiraCreateIssue,
	"linear.create_issue": handleLinearCreateIssue,

	// ========================================
	// GitHub actions
	// ========================================
	"github.create_issue": handleGitHubCreateIssue,
	"github.create_pr_comment": handleGitHubCreatePrComment,
	"github.trigger_workflow": handleGitHubTriggerWorkflow,
	"github.create_release": handleGitHubCreateRelease,

	// ========================================
	// Cloudflare actions
	// ========================================
	"cloudflare.purge_cache": handleCloudflarePurgeCache,
	"cloudflare.create_dns_record": handleCloudflareCreateDnsRecord,
	"cloudflare_r2.upload": handleCloudflareR2Upload,

	// ========================================
	// AWS actions
	// ========================================
	"aws_s3.upload": handleAwsS3Upload,
	"aws_sns.publish": handleAwsSnsPublish,
	"aws_sqs.send_message": handleAwsSqsSendMessage,
	"aws_lambda.invoke": handleAwsLambdaInvoke,
	"aws_ses.send_email": handleAwsSesSendEmail,

	// ========================================
	// Deployment actions
	// ========================================
	"vercel.deploy": handleVercelDeploy,
	"vercel.redeploy": handleVercelRedeploy,
	"netlify.trigger_build": handleNetlifyTriggerBuild,

	// ========================================
	// CRM actions
	// ========================================
	"hubspot.create_contact": handleHubSpotCreateContact,
	"hubspot.create_deal": handleHubSpotCreateDeal,
	"salesforce.create_lead": handleSalesforceCreateLead,
	"pipedrive.create_deal": handlePipedriveCreateDeal,
	"zendesk.create_ticket": handleZendeskCreateTicket,
	"intercom.send_message": handleIntercomSendMessage,
	"freshdesk.create_ticket": handleFreshdeskCreateTicket,

	// ========================================
	// E-commerce actions
	// ========================================
	"shopify.create_order": handleShopifyCreateOrder,
	"stripe.create_invoice": handleStripeCreateInvoice,
	"mailchimp.add_subscriber": handleMailchimpAddSubscriber,
	"klaviyo.add_profile": handleKlaviyoAddProfile,
	"sendgrid.send_email": handleSendGridSendEmail,

	// ========================================
	// Analytics actions
	// ========================================
	"segment.track": handleSegmentTrack,
	"mixpanel.track": handleMixpanelTrack,
	"posthog.capture": handlePostHogCapture,

	// ========================================
	// Integration actions
	// ========================================
	"webhook.send": handleWebhookSend,
}

/**
 * Execute an action by type
 */
export async function executeAction(
	action: WorkflowAction,
	config: ActionConfig,
	context: WorkflowExecutionContext
): Promise<ActionResult> {
	const handler = ACTION_HANDLERS[action]

	if (!handler) {
		// Special cases that aren't actions per se
		if (action === "condition.if") {
			return { success: true, skipped: true, skipReason: "Condition handled separately" }
		}
		if (action === "delay.wait" || action === "delay.wait_until") {
			return { success: true, skipped: true, skipReason: "Delay handled separately" }
		}

		// For unimplemented actions, return a helpful message
		return {
			success: true,
			output: {
				action,
				status: "not_implemented",
				note: `Action "${action}" is not yet implemented. Configure the integration in workspace settings.`,
			},
		}
	}

	try {
		return await handler(config, context)
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Action execution failed",
		}
	}
}

/**
 * Check if an action type has a registered handler
 */
export function hasActionHandler(action: string): boolean {
	return action in ACTION_HANDLERS
}

/**
 * Get list of supported actions
 */
export function getSupportedActions(): string[] {
	return Object.keys(ACTION_HANDLERS)
}

/**
 * Get count of supported actions
 */
export function getActionCount(): number {
	return Object.keys(ACTION_HANDLERS).length
}

// Re-export core handlers for direct use
export {
	handleEmailSend,
	handleEmailSendTemplate,
	handleNotificationPush,
	handleNotificationSms,
	handleCustomerAddTag,
	handleCustomerRemoveTag,
	handleCustomerUpdateField,
	handleOrderAddNote,
	handleOrderUpdateStatus,
	handleProductUpdateStock,
	handleWebhookSend,
	handleSlackSendMessage,
}
