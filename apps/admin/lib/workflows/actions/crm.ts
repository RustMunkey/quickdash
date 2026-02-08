import type { ActionHandler, ActionResult } from "../types"
import { resolveConfigVariables } from "../variable-resolver"

// ============================================================================
// HubSpot Configurations
// ============================================================================

export interface HubSpotCreateContactConfig {
	email: string
	firstName?: string
	lastName?: string
	phone?: string
	company?: string
	properties?: Record<string, string>
}

export interface HubSpotCreateDealConfig {
	name: string
	amount?: number
	stage?: string
	contactEmail?: string
	properties?: Record<string, string>
}

export interface HubSpotCreateTicketConfig {
	subject: string
	content: string
	pipeline?: string
	status?: string
}

export interface HubSpotAddToListConfig {
	listId: string
	email: string
}

// ============================================================================
// Salesforce Configurations
// ============================================================================

export interface SalesforceCreateLeadConfig {
	firstName: string
	lastName: string
	email: string
	company: string
	phone?: string
	title?: string
	source?: string
}

export interface SalesforceCreateOpportunityConfig {
	name: string
	stageName: string
	amount?: number
	closeDate: string
	accountId?: string
}

export interface SalesforceCreateTaskConfig {
	subject: string
	description?: string
	dueDate?: string
	priority?: "High" | "Normal" | "Low"
	whoId?: string
}

// ============================================================================
// Pipedrive Configurations
// ============================================================================

export interface PipedriveCreateDealConfig {
	title: string
	value?: number
	currency?: string
	stageId?: number
	personId?: number
	orgId?: number
}

export interface PipedriveCreatePersonConfig {
	name: string
	email?: string
	phone?: string
	orgId?: number
}

// ============================================================================
// Zendesk Configurations
// ============================================================================

export interface ZendeskCreateTicketConfig {
	subject: string
	description: string
	requesterEmail: string
	priority?: "low" | "normal" | "high" | "urgent"
	type?: "problem" | "incident" | "question" | "task"
	tags?: string[]
}

export interface ZendeskUpdateTicketConfig {
	ticketId: number
	status?: "new" | "open" | "pending" | "hold" | "solved" | "closed"
	priority?: "low" | "normal" | "high" | "urgent"
	comment?: string
}

// ============================================================================
// Intercom Configurations
// ============================================================================

export interface IntercomSendMessageConfig {
	userId?: string
	email?: string
	message: string
	messageType?: "inapp" | "email"
}

export interface IntercomCreateContactConfig {
	email: string
	name?: string
	phone?: string
	customAttributes?: Record<string, unknown>
}

export interface IntercomAddTagConfig {
	userId?: string
	email?: string
	tagName: string
}

// ============================================================================
// Freshdesk Configurations
// ============================================================================

export interface FreshdeskCreateTicketConfig {
	subject: string
	description: string
	email: string
	priority?: 1 | 2 | 3 | 4 // 1=Low, 2=Medium, 3=High, 4=Urgent
	status?: 2 | 3 | 4 | 5 // 2=Open, 3=Pending, 4=Resolved, 5=Closed
	type?: string
	tags?: string[]
}

// ============================================================================
// E-commerce Configurations
// ============================================================================

export interface ShopifyCreateOrderConfig {
	lineItems: Array<{
		variantId: string
		quantity: number
	}>
	customerEmail: string
	shippingAddress?: {
		firstName: string
		lastName: string
		address1: string
		city: string
		province: string
		country: string
		zip: string
	}
}

export interface ShopifyUpdateInventoryConfig {
	inventoryItemId: string
	locationId: string
	available: number
}

export interface StripeCreateInvoiceConfig {
	customerId: string
	items: Array<{
		description: string
		amount: number
		currency?: string
	}>
	daysUntilDue?: number
	autoAdvance?: boolean
}

export interface StripeCreateCustomerConfig {
	email: string
	name?: string
	phone?: string
	metadata?: Record<string, string>
}

// ============================================================================
// Email Marketing Configurations
// ============================================================================

export interface MailchimpAddSubscriberConfig {
	listId: string
	email: string
	firstName?: string
	lastName?: string
	tags?: string[]
	mergeFields?: Record<string, string>
}

export interface MailchimpUpdateSubscriberConfig {
	listId: string
	email: string
	tags?: string[]
	mergeFields?: Record<string, string>
}

export interface KlaviyoAddProfileConfig {
	email: string
	firstName?: string
	lastName?: string
	phone?: string
	properties?: Record<string, unknown>
}

export interface KlaviyoTrackEventConfig {
	email: string
	event: string
	properties?: Record<string, unknown>
}

export interface SendGridSendEmailConfig {
	to: string
	from: string
	subject: string
	text?: string
	html?: string
	templateId?: string
	dynamicTemplateData?: Record<string, unknown>
}

// ============================================================================
// Analytics Configurations
// ============================================================================

export interface SegmentTrackConfig {
	event: string
	userId?: string
	anonymousId?: string
	properties?: Record<string, unknown>
}

export interface SegmentIdentifyConfig {
	userId: string
	traits?: Record<string, unknown>
}

export interface MixpanelTrackConfig {
	event: string
	distinctId: string
	properties?: Record<string, unknown>
}

export interface PostHogCaptureConfig {
	event: string
	distinctId: string
	properties?: Record<string, unknown>
}

export interface GoogleAnalyticsEventConfig {
	measurementId: string
	clientId: string
	eventName: string
	params?: Record<string, unknown>
}

// ============================================================================
// CRM Handlers
// ============================================================================

export const handleHubSpotCreateContact: ActionHandler<HubSpotCreateContactConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { email, firstName, lastName, phone, company, properties } = resolved

	if (!email) {
		return { success: false, error: "Email is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "hubspot",
				operation: "create_contact",
				email: email.includes("@") ? email.split("@")[0] + "@***" : email,
				hasName: !!(firstName || lastName),
				hasPhone: !!phone,
				hasCompany: !!company,
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure HubSpot OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleHubSpotCreateDeal: ActionHandler<HubSpotCreateDealConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { name, amount, stage, contactEmail, properties } = resolved

	if (!name) {
		return { success: false, error: "Deal name is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "hubspot",
				operation: "create_deal",
				name,
				amount: amount || 0,
				stage: stage || "default",
				hasContact: !!contactEmail,
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure HubSpot OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleSalesforceCreateLead: ActionHandler<SalesforceCreateLeadConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { firstName, lastName, email, company, phone, title, source } = resolved

	if (!lastName || !email || !company) {
		return { success: false, error: "Last name, email, and company are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "salesforce",
				operation: "create_lead",
				name: `${firstName || ""} ${lastName}`.trim(),
				email: email.includes("@") ? email.split("@")[0] + "@***" : email,
				company,
				hasPhone: !!phone,
				source: source || "Web",
				status: "pending_integration",
				note: "Configure Salesforce OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handlePipedriveCreateDeal: ActionHandler<PipedriveCreateDealConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { title, value, currency, stageId, personId, orgId } = resolved

	if (!title) {
		return { success: false, error: "Deal title is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "pipedrive",
				operation: "create_deal",
				title,
				value: value || 0,
				currency: currency || "USD",
				hasPerson: !!personId,
				hasOrg: !!orgId,
				status: "pending_integration",
				note: "Configure Pipedrive API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleZendeskCreateTicket: ActionHandler<ZendeskCreateTicketConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { subject, description, requesterEmail, priority, type, tags } = resolved

	if (!subject || !description || !requesterEmail) {
		return { success: false, error: "Subject, description, and requester email are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "zendesk",
				operation: "create_ticket",
				subject: subject.slice(0, 50) + (subject.length > 50 ? "..." : ""),
				requesterEmail: requesterEmail.includes("@") ? requesterEmail.split("@")[0] + "@***" : requesterEmail,
				priority: priority || "normal",
				type: type || "question",
				tagCount: tags?.length || 0,
				status: "pending_integration",
				note: "Configure Zendesk OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleIntercomSendMessage: ActionHandler<IntercomSendMessageConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { userId, email, message, messageType } = resolved

	if (!userId && !email) {
		return { success: false, error: "User ID or email is required" }
	}
	if (!message) {
		return { success: false, error: "Message is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "intercom",
				operation: "send_message",
				identifier: userId || (email?.includes("@") ? email.split("@")[0] + "@***" : email),
				messageType: messageType || "inapp",
				messagePreview: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
				status: "pending_integration",
				note: "Configure Intercom OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleFreshdeskCreateTicket: ActionHandler<FreshdeskCreateTicketConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { subject, description, email, priority, status, type, tags } = resolved

	if (!subject || !description || !email) {
		return { success: false, error: "Subject, description, and email are required" }
	}

	try {
		const priorityMap = { 1: "Low", 2: "Medium", 3: "High", 4: "Urgent" }
		return {
			success: true,
			output: {
				platform: "freshdesk",
				operation: "create_ticket",
				subject: subject.slice(0, 50) + (subject.length > 50 ? "..." : ""),
				email: email.includes("@") ? email.split("@")[0] + "@***" : email,
				priority: priorityMap[priority as keyof typeof priorityMap] || "Medium",
				type: type || "Question",
				tagCount: tags?.length || 0,
				status: "pending_integration",
				note: "Configure Freshdesk API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

// ============================================================================
// E-commerce Handlers
// ============================================================================

export const handleShopifyCreateOrder: ActionHandler<ShopifyCreateOrderConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { lineItems, customerEmail, shippingAddress } = resolved

	if (!lineItems || lineItems.length === 0 || !customerEmail) {
		return { success: false, error: "Line items and customer email are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "shopify",
				operation: "create_order",
				customerEmail: customerEmail.includes("@") ? customerEmail.split("@")[0] + "@***" : customerEmail,
				lineItemCount: lineItems.length,
				hasShippingAddress: !!shippingAddress,
				status: "pending_integration",
				note: "Configure Shopify OAuth in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleStripeCreateInvoice: ActionHandler<StripeCreateInvoiceConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { customerId, items, daysUntilDue, autoAdvance } = resolved

	if (!customerId || !items || items.length === 0) {
		return { success: false, error: "Customer ID and items are required" }
	}

	try {
		const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
		return {
			success: true,
			output: {
				platform: "stripe",
				operation: "create_invoice",
				customerId: customerId.slice(0, 4) + "***",
				itemCount: items.length,
				totalAmount,
				daysUntilDue: daysUntilDue || 30,
				autoAdvance: autoAdvance ?? true,
				status: "pending_integration",
				note: "Configure Stripe API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleMailchimpAddSubscriber: ActionHandler<MailchimpAddSubscriberConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { listId, email, firstName, lastName, tags, mergeFields } = resolved

	if (!listId || !email) {
		return { success: false, error: "List ID and email are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "mailchimp",
				operation: "add_subscriber",
				listId,
				email: email.includes("@") ? email.split("@")[0] + "@***" : email,
				hasName: !!(firstName || lastName),
				tagCount: tags?.length || 0,
				mergeFieldCount: Object.keys(mergeFields || {}).length,
				status: "pending_integration",
				note: "Configure Mailchimp API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleKlaviyoAddProfile: ActionHandler<KlaviyoAddProfileConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { email, firstName, lastName, phone, properties } = resolved

	if (!email) {
		return { success: false, error: "Email is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "klaviyo",
				operation: "add_profile",
				email: email.includes("@") ? email.split("@")[0] + "@***" : email,
				hasName: !!(firstName || lastName),
				hasPhone: !!phone,
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure Klaviyo API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleSendGridSendEmail: ActionHandler<SendGridSendEmailConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { to, from, subject, text, html, templateId, dynamicTemplateData } = resolved

	if (!to || !from || !subject) {
		return { success: false, error: "To, from, and subject are required" }
	}

	if (!text && !html && !templateId) {
		return { success: false, error: "Text, HTML, or template ID is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "sendgrid",
				operation: "send_email",
				to: to.includes("@") ? to.split("@")[0] + "@***" : to,
				subject: subject.slice(0, 50) + (subject.length > 50 ? "..." : ""),
				hasTemplate: !!templateId,
				hasDynamicData: Object.keys(dynamicTemplateData || {}).length > 0,
				status: "pending_integration",
				note: "Configure SendGrid API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

// ============================================================================
// Analytics Handlers
// ============================================================================

export const handleSegmentTrack: ActionHandler<SegmentTrackConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { event, userId, anonymousId, properties } = resolved

	if (!event) {
		return { success: false, error: "Event name is required" }
	}

	if (!userId && !anonymousId) {
		return { success: false, error: "User ID or anonymous ID is required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "segment",
				operation: "track",
				event,
				hasUserId: !!userId,
				hasAnonymousId: !!anonymousId,
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure Segment write key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handleMixpanelTrack: ActionHandler<MixpanelTrackConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { event, distinctId, properties } = resolved

	if (!event || !distinctId) {
		return { success: false, error: "Event name and distinct ID are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "mixpanel",
				operation: "track",
				event,
				distinctId: distinctId.slice(0, 4) + "***",
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure Mixpanel token in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}

export const handlePostHogCapture: ActionHandler<PostHogCaptureConfig> = async (
	config,
	context
): Promise<ActionResult> => {
	const resolved = resolveConfigVariables(config, context)
	const { event, distinctId, properties } = resolved

	if (!event || !distinctId) {
		return { success: false, error: "Event name and distinct ID are required" }
	}

	try {
		return {
			success: true,
			output: {
				platform: "posthog",
				operation: "capture",
				event,
				distinctId: distinctId.slice(0, 4) + "***",
				propertyCount: Object.keys(properties || {}).length,
				status: "pending_integration",
				note: "Configure PostHog API key in workspace integrations",
			},
		}
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed" }
	}
}
