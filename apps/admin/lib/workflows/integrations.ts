/**
 * Workspace Integration Helpers
 *
 * Functions for fetching and using BYOK credentials from workspace integrations
 */

import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workspaceIntegrations, integrationUsageLogs } from "@quickdash/db/schema"
import type {
	IntegrationProvider,
	OAuthCredentials,
	ApiKeyCredentials,
	WebhookCredentials,
} from "@quickdash/db/schema"

export interface IntegrationCredentials {
	id: string
	provider: IntegrationProvider
	authType: string
	credentials: Record<string, unknown>
	metadata: Record<string, unknown>
}

/**
 * Get an active integration for a workspace
 */
export async function getWorkspaceIntegration(
	workspaceId: string,
	provider: IntegrationProvider
): Promise<IntegrationCredentials | null> {
	const [integration] = await db
		.select({
			id: workspaceIntegrations.id,
			provider: workspaceIntegrations.provider,
			authType: workspaceIntegrations.authType,
			credentials: workspaceIntegrations.credentials,
			metadata: workspaceIntegrations.metadata,
		})
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, provider),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	if (!integration) return null

	// Update lastUsedAt
	await db
		.update(workspaceIntegrations)
		.set({ lastUsedAt: new Date() })
		.where(eq(workspaceIntegrations.id, integration.id))

	return integration as IntegrationCredentials
}

/**
 * Get OAuth credentials for a provider
 */
export async function getOAuthCredentials(
	workspaceId: string,
	provider: IntegrationProvider
): Promise<OAuthCredentials | null> {
	const integration = await getWorkspaceIntegration(workspaceId, provider)
	if (!integration || integration.authType !== "oauth2") return null
	return integration.credentials as unknown as OAuthCredentials
}

/**
 * Get API key credentials for a provider
 */
export async function getApiKeyCredentials(
	workspaceId: string,
	provider: IntegrationProvider
): Promise<ApiKeyCredentials | null> {
	const integration = await getWorkspaceIntegration(workspaceId, provider)
	if (!integration || integration.authType !== "api_key") return null
	return integration.credentials as unknown as ApiKeyCredentials
}

/**
 * Get webhook credentials for a provider
 */
export async function getWebhookCredentials(
	workspaceId: string,
	provider: IntegrationProvider
): Promise<WebhookCredentials | null> {
	const integration = await getWorkspaceIntegration(workspaceId, provider)
	if (!integration || integration.authType !== "webhook") return null
	return integration.credentials as unknown as WebhookCredentials
}

/**
 * Log integration usage (for rate limiting and billing)
 */
export async function logIntegrationUsage(params: {
	integrationId: string
	workspaceId: string
	action: string
	endpoint?: string
	success: boolean
	statusCode?: string
	errorMessage?: string
	durationMs?: number
	workflowRunId?: string
	metadata?: Record<string, unknown>
}) {
	await db.insert(integrationUsageLogs).values({
		integrationId: params.integrationId,
		workspaceId: params.workspaceId,
		action: params.action,
		endpoint: params.endpoint,
		success: params.success,
		statusCode: params.statusCode,
		errorMessage: params.errorMessage,
		durationMs: params.durationMs?.toString(),
		workflowRunId: params.workflowRunId,
		metadata: params.metadata || {},
	})
}

/**
 * Mark integration as having an error
 */
export async function markIntegrationError(integrationId: string, error: string) {
	await db
		.update(workspaceIntegrations)
		.set({
			lastError: error,
			updatedAt: new Date(),
		})
		.where(eq(workspaceIntegrations.id, integrationId))
}

/**
 * Clear integration error
 */
export async function clearIntegrationError(integrationId: string) {
	await db
		.update(workspaceIntegrations)
		.set({
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(workspaceIntegrations.id, integrationId))
}

/**
 * Check if a workspace has a specific integration configured
 */
export async function hasIntegration(
	workspaceId: string,
	provider: IntegrationProvider
): Promise<boolean> {
	const [integration] = await db
		.select({ id: workspaceIntegrations.id })
		.from(workspaceIntegrations)
		.where(
			and(
				eq(workspaceIntegrations.workspaceId, workspaceId),
				eq(workspaceIntegrations.provider, provider),
				eq(workspaceIntegrations.isActive, true)
			)
		)
		.limit(1)

	return !!integration
}

/**
 * Get all active integrations for a workspace
 */
export async function getWorkspaceIntegrations(workspaceId: string) {
	return db
		.select({
			id: workspaceIntegrations.id,
			provider: workspaceIntegrations.provider,
			name: workspaceIntegrations.name,
			authType: workspaceIntegrations.authType,
			isActive: workspaceIntegrations.isActive,
			lastUsedAt: workspaceIntegrations.lastUsedAt,
			lastError: workspaceIntegrations.lastError,
			createdAt: workspaceIntegrations.createdAt,
		})
		.from(workspaceIntegrations)
		.where(eq(workspaceIntegrations.workspaceId, workspaceId))
		.orderBy(workspaceIntegrations.provider)
}

/**
 * Integration provider metadata for UI
 */
export const INTEGRATION_METADATA: Record<
	IntegrationProvider,
	{
		name: string
		description: string
		category: string
		icon: string
		authType: "oauth2" | "api_key" | "webhook" | "basic_auth" | "bearer_token"
		oauthUrl?: string
		docUrl?: string
	}
> = {
	// Social Media
	twitter: {
		name: "X (Twitter)",
		description: "Post tweets and send DMs",
		category: "Social Media",
		icon: "NewTwitterIcon",
		authType: "oauth2",
		oauthUrl: "https://twitter.com/i/oauth2/authorize",
		docUrl: "https://developer.twitter.com/en/docs",
	},
	facebook: {
		name: "Facebook",
		description: "Post to pages and send messages",
		category: "Social Media",
		icon: "Facebook01Icon",
		authType: "oauth2",
		oauthUrl: "https://www.facebook.com/v18.0/dialog/oauth",
		docUrl: "https://developers.facebook.com/docs/",
	},
	instagram: {
		name: "Instagram",
		description: "Post photos and stories",
		category: "Social Media",
		icon: "InstagramIcon",
		authType: "oauth2",
		docUrl: "https://developers.facebook.com/docs/instagram-api/",
	},
	linkedin: {
		name: "LinkedIn",
		description: "Post updates to your profile or company page",
		category: "Social Media",
		icon: "Linkedin01Icon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/linkedin/",
	},
	tiktok: {
		name: "TikTok",
		description: "Post videos to TikTok",
		category: "Social Media",
		icon: "TiktokIcon",
		authType: "oauth2",
		docUrl: "https://developers.tiktok.com/doc/",
	},
	pinterest: {
		name: "Pinterest",
		description: "Create pins and boards",
		category: "Social Media",
		icon: "PinterestIcon",
		authType: "oauth2",
		docUrl: "https://developers.pinterest.com/docs/",
	},
	threads: {
		name: "Threads",
		description: "Post to Threads",
		category: "Social Media",
		icon: "ThreadsIcon",
		authType: "oauth2",
		docUrl: "https://developers.facebook.com/docs/threads/",
	},
	youtube: {
		name: "YouTube",
		description: "Upload videos and manage channel",
		category: "Social Media",
		icon: "YoutubeIcon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/youtube/v3",
	},

	// Communication
	slack: {
		name: "Slack",
		description: "Send messages to channels",
		category: "Communication",
		icon: "SlackIcon",
		authType: "webhook",
		docUrl: "https://api.slack.com/messaging/webhooks",
	},
	discord: {
		name: "Discord",
		description: "Send messages via webhooks or bot",
		category: "Communication",
		icon: "DiscordIcon",
		authType: "webhook",
		docUrl: "https://discord.com/developers/docs/",
	},
	teams: {
		name: "Microsoft Teams",
		description: "Send messages to Teams channels",
		category: "Communication",
		icon: "TeamsIcon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview",
	},
	telegram: {
		name: "Telegram",
		description: "Send messages via Telegram bot",
		category: "Communication",
		icon: "TelegramIcon",
		authType: "api_key",
		docUrl: "https://core.telegram.org/bots/api",
	},
	whatsapp: {
		name: "WhatsApp Business",
		description: "Send messages via WhatsApp Business API",
		category: "Communication",
		icon: "WhatsappIcon",
		authType: "api_key",
		docUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/",
	},
	twilio: {
		name: "Twilio",
		description: "Send SMS and make calls",
		category: "Communication",
		icon: "SmartPhone01Icon",
		authType: "api_key",
		docUrl: "https://www.twilio.com/docs",
	},

	// Google Suite
	google: {
		name: "Google",
		description: "Google OAuth for all services",
		category: "Google Suite",
		icon: "GoogleIcon",
		authType: "oauth2",
		oauthUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		docUrl: "https://developers.google.com/identity/protocols/oauth2",
	},
	gmail: {
		name: "Gmail",
		description: "Send emails via Gmail",
		category: "Google Suite",
		icon: "MailSend01Icon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/gmail/api",
	},
	google_sheets: {
		name: "Google Sheets",
		description: "Read and write spreadsheet data",
		category: "Google Suite",
		icon: "GoogleSheetsIcon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/sheets/api",
	},
	google_docs: {
		name: "Google Docs",
		description: "Create and edit documents",
		category: "Google Suite",
		icon: "GoogleDocIcon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/docs/api",
	},
	google_drive: {
		name: "Google Drive",
		description: "Upload and manage files",
		category: "Google Suite",
		icon: "GoogleDriveIcon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/drive/api",
	},
	google_calendar: {
		name: "Google Calendar",
		description: "Create and manage calendar events",
		category: "Google Suite",
		icon: "Calendar01Icon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/calendar/api",
	},

	// Microsoft Suite
	microsoft: {
		name: "Microsoft",
		description: "Microsoft OAuth for all services",
		category: "Microsoft Suite",
		icon: "MicrosoftIcon",
		authType: "oauth2",
		oauthUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
		docUrl: "https://learn.microsoft.com/en-us/graph/",
	},
	outlook: {
		name: "Outlook",
		description: "Send emails via Outlook",
		category: "Microsoft Suite",
		icon: "Mail01Icon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview",
	},
	excel: {
		name: "Excel Online",
		description: "Read and write Excel workbooks",
		category: "Microsoft Suite",
		icon: "FileExcelIcon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/graph/api/resources/excel",
	},
	word: {
		name: "Word Online",
		description: "Create and edit Word documents",
		category: "Microsoft Suite",
		icon: "FileWordIcon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/graph/api/resources/document",
	},
	onedrive: {
		name: "OneDrive",
		description: "Upload and manage files",
		category: "Microsoft Suite",
		icon: "CloudUploadIcon",
		authType: "oauth2",
		docUrl: "https://learn.microsoft.com/en-us/graph/api/resources/onedrive",
	},
	teams_webhook: {
		name: "Teams Webhook",
		description: "Send messages via incoming webhook",
		category: "Microsoft Suite",
		icon: "TeamsIcon",
		authType: "webhook",
		docUrl: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/",
	},

	// Productivity
	notion: {
		name: "Notion",
		description: "Create pages and update databases",
		category: "Productivity",
		icon: "NotionIcon",
		authType: "oauth2",
		docUrl: "https://developers.notion.com/",
	},
	airtable: {
		name: "Airtable",
		description: "Create and update records",
		category: "Productivity",
		icon: "TableIcon",
		authType: "api_key",
		docUrl: "https://airtable.com/developers/web/api/introduction",
	},
	trello: {
		name: "Trello",
		description: "Create cards and manage boards",
		category: "Productivity",
		icon: "TrelloIcon",
		authType: "api_key",
		docUrl: "https://developer.atlassian.com/cloud/trello/",
	},
	asana: {
		name: "Asana",
		description: "Create tasks and manage projects",
		category: "Productivity",
		icon: "TaskDone02Icon",
		authType: "oauth2",
		docUrl: "https://developers.asana.com/docs",
	},
	monday: {
		name: "Monday.com",
		description: "Create items and update boards",
		category: "Productivity",
		icon: "Calendar03Icon",
		authType: "api_key",
		docUrl: "https://developer.monday.com/api-reference/",
	},
	clickup: {
		name: "ClickUp",
		description: "Create tasks and manage spaces",
		category: "Productivity",
		icon: "CheckmarkCircle01Icon",
		authType: "api_key",
		docUrl: "https://clickup.com/api",
	},
	jira: {
		name: "Jira",
		description: "Create issues and manage projects",
		category: "Productivity",
		icon: "JiraIcon",
		authType: "oauth2",
		docUrl: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/",
	},
	linear: {
		name: "Linear",
		description: "Create issues and manage projects",
		category: "Productivity",
		icon: "Ticket02Icon",
		authType: "api_key",
		docUrl: "https://developers.linear.app/docs",
	},

	// GitHub & DevOps
	github: {
		name: "GitHub",
		description: "Create issues, PRs, and trigger workflows",
		category: "DevOps",
		icon: "GithubIcon",
		authType: "oauth2",
		oauthUrl: "https://github.com/login/oauth/authorize",
		docUrl: "https://docs.github.com/en/rest",
	},
	gitlab: {
		name: "GitLab",
		description: "Create issues and manage repositories",
		category: "DevOps",
		icon: "GitlabIcon",
		authType: "oauth2",
		docUrl: "https://docs.gitlab.com/ee/api/",
	},
	bitbucket: {
		name: "Bitbucket",
		description: "Create issues and manage repositories",
		category: "DevOps",
		icon: "BitbucketIcon",
		authType: "oauth2",
		docUrl: "https://developer.atlassian.com/cloud/bitbucket/",
	},

	// Cloud Providers
	aws: {
		name: "Amazon Web Services",
		description: "S3, Lambda, SES, SNS, SQS",
		category: "Cloud",
		icon: "AwsIcon",
		authType: "api_key",
		docUrl: "https://docs.aws.amazon.com/",
	},
	cloudflare: {
		name: "Cloudflare",
		description: "DNS, cache purge, R2 storage",
		category: "Cloud",
		icon: "CloudIcon",
		authType: "api_key",
		docUrl: "https://developers.cloudflare.com/api/",
	},
	vercel: {
		name: "Vercel",
		description: "Deploy and redeploy projects",
		category: "Cloud",
		icon: "RocketIcon",
		authType: "bearer_token",
		docUrl: "https://vercel.com/docs/rest-api",
	},
	netlify: {
		name: "Netlify",
		description: "Trigger builds and manage sites",
		category: "Cloud",
		icon: "BuildingIcon",
		authType: "api_key",
		docUrl: "https://docs.netlify.com/api/",
	},
	digitalocean: {
		name: "DigitalOcean",
		description: "Manage droplets and apps",
		category: "Cloud",
		icon: "CloudIcon",
		authType: "bearer_token",
		docUrl: "https://docs.digitalocean.com/reference/api/",
	},

	// CRM & Sales
	hubspot: {
		name: "HubSpot",
		description: "Create contacts and deals",
		category: "CRM",
		icon: "ContactIcon",
		authType: "oauth2",
		docUrl: "https://developers.hubspot.com/docs/api/overview",
	},
	salesforce: {
		name: "Salesforce",
		description: "Create leads and manage accounts",
		category: "CRM",
		icon: "CloudIcon",
		authType: "oauth2",
		docUrl: "https://developer.salesforce.com/docs/apis",
	},
	pipedrive: {
		name: "Pipedrive",
		description: "Create deals and manage pipeline",
		category: "CRM",
		icon: "Chart01Icon",
		authType: "api_key",
		docUrl: "https://developers.pipedrive.com/docs/api/v1",
	},
	zendesk: {
		name: "Zendesk",
		description: "Create tickets and manage support",
		category: "CRM",
		icon: "Ticket01Icon",
		authType: "api_key",
		docUrl: "https://developer.zendesk.com/api-reference/",
	},
	intercom: {
		name: "Intercom",
		description: "Send messages and manage conversations",
		category: "CRM",
		icon: "MessageCircle01Icon",
		authType: "bearer_token",
		docUrl: "https://developers.intercom.com/docs",
	},
	freshdesk: {
		name: "Freshdesk",
		description: "Create tickets and manage support",
		category: "CRM",
		icon: "TicketStar01Icon",
		authType: "api_key",
		docUrl: "https://developers.freshdesk.com/api/",
	},

	// E-commerce & Payments
	shopify: {
		name: "Shopify",
		description: "Sync orders and products",
		category: "E-commerce",
		icon: "ShoppingBag01Icon",
		authType: "oauth2",
		docUrl: "https://shopify.dev/docs/api",
	},
	stripe: {
		name: "Stripe",
		description: "Create invoices and manage payments",
		category: "E-commerce",
		icon: "Invoice02Icon",
		authType: "api_key",
		docUrl: "https://stripe.com/docs/api",
	},
	paypal: {
		name: "PayPal",
		description: "Process payments",
		category: "E-commerce",
		icon: "PaypalIcon",
		authType: "oauth2",
		docUrl: "https://developer.paypal.com/docs/api/overview/",
	},
	square: {
		name: "Square",
		description: "Process payments and manage inventory",
		category: "E-commerce",
		icon: "Square01Icon",
		authType: "oauth2",
		docUrl: "https://developer.squareup.com/docs/",
	},
	polar: {
		name: "Polar",
		description: "Accept payments and subscriptions for digital products",
		category: "E-commerce",
		icon: "CreditCardIcon",
		authType: "api_key",
		docUrl: "https://docs.polar.sh/",
	},
	reown: {
		name: "Reown (WalletConnect)",
		description: "Accept crypto payments via WalletConnect",
		category: "E-commerce",
		icon: "WalletIcon",
		authType: "api_key",
		docUrl: "https://docs.reown.com/",
	},

	// Marketing & Email
	resend: {
		name: "Resend",
		description: "Transactional email delivery",
		category: "Marketing",
		icon: "MailSend01Icon",
		authType: "api_key",
		docUrl: "https://resend.com/docs",
	},
	mailchimp: {
		name: "Mailchimp",
		description: "Add subscribers and send campaigns",
		category: "Marketing",
		icon: "MailAdd01Icon",
		authType: "api_key",
		docUrl: "https://mailchimp.com/developer/marketing/api/",
	},
	klaviyo: {
		name: "Klaviyo",
		description: "Add profiles and track events",
		category: "Marketing",
		icon: "UserAdd02Icon",
		authType: "api_key",
		docUrl: "https://developers.klaviyo.com/en",
	},
	sendgrid: {
		name: "SendGrid",
		description: "Send transactional emails",
		category: "Marketing",
		icon: "MailSend02Icon",
		authType: "api_key",
		docUrl: "https://docs.sendgrid.com/api-reference/",
	},
	mailgun: {
		name: "Mailgun",
		description: "Send transactional emails",
		category: "Marketing",
		icon: "MailSend01Icon",
		authType: "api_key",
		docUrl: "https://documentation.mailgun.com/en/latest/api_reference.html",
	},
	postmark: {
		name: "Postmark",
		description: "Send transactional emails",
		category: "Marketing",
		icon: "MailSend01Icon",
		authType: "api_key",
		docUrl: "https://postmarkapp.com/developer",
	},

	// Analytics
	segment: {
		name: "Segment",
		description: "Track events and identify users",
		category: "Analytics",
		icon: "Analytics01Icon",
		authType: "api_key",
		docUrl: "https://segment.com/docs/connections/sources/catalog/",
	},
	mixpanel: {
		name: "Mixpanel",
		description: "Track events and analyze user behavior",
		category: "Analytics",
		icon: "ChartHistogramIcon",
		authType: "api_key",
		docUrl: "https://developer.mixpanel.com/reference/overview",
	},
	posthog: {
		name: "PostHog",
		description: "Capture events and analyze product usage",
		category: "Analytics",
		icon: "ChartLineData01Icon",
		authType: "api_key",
		docUrl: "https://posthog.com/docs/api",
	},
	amplitude: {
		name: "Amplitude",
		description: "Track events and analyze user behavior",
		category: "Analytics",
		icon: "ChartBarLineIcon",
		authType: "api_key",
		docUrl: "https://www.docs.developers.amplitude.com/",
	},
	google_analytics: {
		name: "Google Analytics",
		description: "Track website analytics",
		category: "Analytics",
		icon: "GoogleIcon",
		authType: "oauth2",
		docUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
	},

	// AI Providers
	openai: {
		name: "OpenAI",
		description: "GPT models for text generation",
		category: "AI",
		icon: "AiChat02Icon",
		authType: "api_key",
		docUrl: "https://platform.openai.com/docs/api-reference",
	},
	anthropic: {
		name: "Anthropic",
		description: "Claude models for text generation",
		category: "AI",
		icon: "AiChat02Icon",
		authType: "api_key",
		docUrl: "https://docs.anthropic.com/en/api",
	},
	cohere: {
		name: "Cohere",
		description: "NLP models for text processing",
		category: "AI",
		icon: "AiChat02Icon",
		authType: "api_key",
		docUrl: "https://docs.cohere.com/reference/about",
	},
	replicate: {
		name: "Replicate",
		description: "Run ML models via API",
		category: "AI",
		icon: "AiChat02Icon",
		authType: "api_key",
		docUrl: "https://replicate.com/docs/reference/http",
	},

	// Storage
	s3: {
		name: "Amazon S3",
		description: "Object storage",
		category: "Storage",
		icon: "CloudUploadIcon",
		authType: "api_key",
		docUrl: "https://docs.aws.amazon.com/s3/",
	},
	cloudflare_r2: {
		name: "Cloudflare R2",
		description: "Object storage",
		category: "Storage",
		icon: "CloudUploadIcon",
		authType: "api_key",
		docUrl: "https://developers.cloudflare.com/r2/",
	},
	google_cloud_storage: {
		name: "Google Cloud Storage",
		description: "Object storage",
		category: "Storage",
		icon: "CloudUploadIcon",
		authType: "oauth2",
		docUrl: "https://cloud.google.com/storage/docs",
	},
	azure_blob: {
		name: "Azure Blob Storage",
		description: "Object storage",
		category: "Storage",
		icon: "CloudUploadIcon",
		authType: "api_key",
		docUrl: "https://learn.microsoft.com/en-us/azure/storage/blobs/",
	},

	// Other
	zapier: {
		name: "Zapier",
		description: "Trigger Zapier workflows",
		category: "Automation",
		icon: "ZapierIcon",
		authType: "webhook",
		docUrl: "https://zapier.com/developer/documentation/v2/",
	},
	make: {
		name: "Make (Integromat)",
		description: "Trigger Make scenarios",
		category: "Automation",
		icon: "WorkflowSquare03Icon",
		authType: "webhook",
		docUrl: "https://www.make.com/en/api-documentation",
	},
	custom_webhook: {
		name: "Custom Webhook",
		description: "Send data to any webhook URL",
		category: "Custom",
		icon: "WebhookIcon",
		authType: "webhook",
	},
}
