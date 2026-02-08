import { pgTable, text, boolean, timestamp, jsonb, uuid, index, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { workspaces } from "./workspaces"
import { users } from "./users"

// Workflow trigger types
export const WORKFLOW_TRIGGERS = [
	// Order triggers
	"order.created",
	"order.paid",
	"order.fulfilled",
	"order.cancelled",
	"order.refunded",
	// Customer triggers
	"customer.created",
	"customer.updated",
	"customer.tag_added",
	// Product triggers
	"product.created",
	"product.updated",
	"product.low_stock",
	"product.out_of_stock",
	// Subscription triggers
	"subscription.created",
	"subscription.renewed",
	"subscription.cancelled",
	"subscription.payment_failed",
	// Review triggers
	"review.created",
	"review.approved",
	"review.reported",
	// Auction triggers
	"auction.started",
	"auction.bid_placed",
	"auction.ending_soon",
	"auction.ended",
	// Cart triggers
	"cart.abandoned",
	"cart.recovered",
	// Gift Card triggers
	"giftcard.purchased",
	"giftcard.redeemed",
	"giftcard.low_balance",
	// Loyalty triggers
	"loyalty.points_earned",
	"loyalty.tier_changed",
	"loyalty.reward_redeemed",
	// Inbox triggers
	"inbox.email_received",
	"inbox.email_replied",
	// Webhook triggers (incoming)
	"webhook.received",
	// Form triggers
	"form.submitted",
	// Referral triggers
	"referral.signup",
	"referral.conversion",
	// Time-based triggers
	"schedule.cron",
	"schedule.interval",
	// Manual triggers
	"manual.trigger",
] as const

export type WorkflowTrigger = (typeof WORKFLOW_TRIGGERS)[number]

// Workflow action types
export const WORKFLOW_ACTIONS = [
	// ========================================
	// Email actions
	// ========================================
	"email.send",
	"email.send_template",

	// ========================================
	// Notification actions
	// ========================================
	"notification.push",
	"notification.sms",

	// ========================================
	// Data actions
	// ========================================
	"customer.add_tag",
	"customer.remove_tag",
	"customer.update_field",
	"order.add_note",
	"order.update_status",
	"product.update_stock",

	// ========================================
	// AI & Bot actions
	// ========================================
	"ai.generate_text",
	"ai.analyze_sentiment",
	"ai.categorize",
	"ai.translate",
	"ai.summarize",

	// ========================================
	// Social Media actions
	// ========================================
	"twitter.post",
	"twitter.dm",
	"facebook.post",
	"facebook.message",
	"instagram.post",
	"instagram.story",
	"linkedin.post",
	"tiktok.post",
	"pinterest.pin",
	"threads.post",

	// ========================================
	// Communication actions
	// ========================================
	"slack.send_message",
	"discord.send_message",
	"discord.create_thread",
	"teams.send_message",
	"telegram.send_message",
	"whatsapp.send_message",

	// ========================================
	// Google Suite actions
	// ========================================
	"google_sheets.add_row",
	"google_sheets.update_row",
	"google_docs.create",
	"google_slides.create",
	"google_drive.upload",
	"google_drive.create_folder",
	"google_calendar.create_event",
	"gmail.send",

	// ========================================
	// Microsoft Suite actions
	// ========================================
	"outlook.send_email",
	"excel.add_row",
	"word.create_doc",
	"powerpoint.create",
	"onedrive.upload",
	"microsoft_todo.create_task",

	// ========================================
	// Productivity actions
	// ========================================
	"notion.create_page",
	"notion.update_database",
	"airtable.create_record",
	"trello.create_card",
	"asana.create_task",
	"monday.create_item",
	"clickup.create_task",
	"jira.create_issue",
	"linear.create_issue",

	// ========================================
	// GitHub actions
	// ========================================
	"github.create_issue",
	"github.create_pr_comment",
	"github.trigger_workflow",
	"github.create_release",

	// ========================================
	// Cloudflare actions
	// ========================================
	"cloudflare.purge_cache",
	"cloudflare.create_dns_record",
	"cloudflare_r2.upload",

	// ========================================
	// AWS actions
	// ========================================
	"aws_s3.upload",
	"aws_sns.publish",
	"aws_sqs.send_message",
	"aws_lambda.invoke",
	"aws_ses.send_email",

	// ========================================
	// Deployment actions
	// ========================================
	"vercel.deploy",
	"vercel.redeploy",
	"netlify.trigger_build",

	// ========================================
	// CRM actions
	// ========================================
	"hubspot.create_contact",
	"hubspot.create_deal",
	"salesforce.create_lead",
	"pipedrive.create_deal",
	"zendesk.create_ticket",
	"intercom.send_message",
	"freshdesk.create_ticket",

	// ========================================
	// E-commerce actions
	// ========================================
	"shopify.create_order",
	"stripe.create_invoice",
	"mailchimp.add_subscriber",
	"klaviyo.add_profile",
	"sendgrid.send_email",

	// ========================================
	// Analytics actions
	// ========================================
	"segment.track",
	"mixpanel.track",
	"posthog.capture",

	// ========================================
	// Integration actions
	// ========================================
	"webhook.send",
	"http.request",

	// ========================================
	// Scheduling actions
	// ========================================
	"calendly.create_event",
	"calendly.cancel_event",
	"zoom.create_meeting",
	"zoom.send_invite",

	// ========================================
	// Accounting actions
	// ========================================
	"quickbooks.create_invoice",
	"quickbooks.create_customer",
	"xero.create_invoice",
	"xero.create_contact",

	// ========================================
	// Database actions
	// ========================================
	"supabase.insert",
	"supabase.update",
	"mongodb.insert",
	"mongodb.update",
	"firebase.set",
	"firebase.push",

	// ========================================
	// Form actions
	// ========================================
	"typeform.get_responses",
	"google_forms.get_responses",

	// ========================================
	// Additional E-commerce actions
	// ========================================
	"woocommerce.create_order",
	"woocommerce.update_order",
	"bigcommerce.create_order",
	"gumroad.get_sales",
	"lemonsqueezy.get_orders",

	// ========================================
	// AI Model actions
	// ========================================
	"gemini.generate",
	"perplexity.search",
	"elevenlabs.text_to_speech",
	"deepgram.transcribe",
	"stability.generate_image",

	// ========================================
	// Monitoring actions
	// ========================================
	"datadog.create_event",
	"sentry.create_issue",
	"pagerduty.trigger_incident",

	// ========================================
	// Document signing actions
	// ========================================
	"docusign.send_envelope",
	"docusign.get_status",
	"pandadoc.create_document",
	"pandadoc.send_document",

	// ========================================
	// SMS/Voice actions
	// ========================================
	"twilio.send_sms",
	"twilio.make_call",
	"vonage.send_sms",
	"messagebird.send_message",

	// ========================================
	// Utility actions
	// ========================================
	"transform.data",
	"branch.split",
	"loop.foreach",

	// ========================================
	// Control flow
	// ========================================
	"condition.if",
	"delay.wait",
	"delay.wait_until",
] as const

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number]

// Workflows table - the main workflow definition
export const workflows = pgTable(
	"workflows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// Basic info
		name: text("name").notNull(),
		description: text("description"),

		// Trigger configuration
		trigger: text("trigger").$type<WorkflowTrigger>().notNull(),
		triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>().default({}),

		// Workflow definition (React Flow nodes/edges)
		nodes: jsonb("nodes").$type<unknown[]>().default([]),
		edges: jsonb("edges").$type<unknown[]>().default([]),

		// Status
		isActive: boolean("is_active").default(false).notNull(),
		isDraft: boolean("is_draft").default(true).notNull(),

		// Stats
		runCount: integer("run_count").default(0).notNull(),
		lastRunAt: timestamp("last_run_at"),
		lastError: text("last_error"),

		// Metadata
		createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("workflows_workspace_idx").on(table.workspaceId),
		index("workflows_trigger_idx").on(table.trigger),
		index("workflows_active_idx").on(table.isActive),
	]
)

// Workflow runs - execution history
export const workflowRuns = pgTable(
	"workflow_runs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workflowId: uuid("workflow_id")
			.notNull()
			.references(() => workflows.id, { onDelete: "cascade" }),
		workspaceId: uuid("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),

		// Trigger context
		triggerEvent: text("trigger_event").notNull(),
		triggerData: jsonb("trigger_data").$type<Record<string, unknown>>().default({}),

		// Execution status
		status: text("status", {
			enum: ["pending", "running", "completed", "failed", "cancelled"],
		})
			.notNull()
			.default("pending"),

		// Results
		output: jsonb("output").$type<Record<string, unknown>>(),
		error: text("error"),

		// Step tracking
		stepsCompleted: integer("steps_completed").default(0).notNull(),
		totalSteps: integer("total_steps").default(0).notNull(),

		// Timing
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("workflow_runs_workflow_idx").on(table.workflowId),
		index("workflow_runs_workspace_idx").on(table.workspaceId),
		index("workflow_runs_status_idx").on(table.status),
		index("workflow_runs_created_idx").on(table.createdAt),
	]
)

// Workflow run steps - individual action executions
export const workflowRunSteps = pgTable(
	"workflow_run_steps",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		runId: uuid("run_id")
			.notNull()
			.references(() => workflowRuns.id, { onDelete: "cascade" }),

		// Step info
		nodeId: text("node_id").notNull(), // React Flow node ID
		action: text("action").$type<WorkflowAction>().notNull(),
		actionConfig: jsonb("action_config").$type<Record<string, unknown>>().default({}),

		// Execution
		status: text("status", {
			enum: ["pending", "running", "completed", "failed", "skipped"],
		})
			.notNull()
			.default("pending"),

		input: jsonb("input").$type<Record<string, unknown>>(),
		output: jsonb("output").$type<Record<string, unknown>>(),
		error: text("error"),

		// Timing
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("workflow_run_steps_run_idx").on(table.runId),
		index("workflow_run_steps_status_idx").on(table.status),
	]
)

// Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [workflows.workspaceId],
		references: [workspaces.id],
	}),
	createdByUser: one(users, {
		fields: [workflows.createdBy],
		references: [users.id],
	}),
	runs: many(workflowRuns),
}))

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
	workflow: one(workflows, {
		fields: [workflowRuns.workflowId],
		references: [workflows.id],
	}),
	workspace: one(workspaces, {
		fields: [workflowRuns.workspaceId],
		references: [workspaces.id],
	}),
	steps: many(workflowRunSteps),
}))

export const workflowRunStepsRelations = relations(workflowRunSteps, ({ one }) => ({
	run: one(workflowRuns, {
		fields: [workflowRunSteps.runId],
		references: [workflowRuns.id],
	}),
}))

// Types
export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
export type WorkflowRun = typeof workflowRuns.$inferSelect
export type NewWorkflowRun = typeof workflowRuns.$inferInsert
export type WorkflowRunStep = typeof workflowRunSteps.$inferSelect
export type NewWorkflowRunStep = typeof workflowRunSteps.$inferInsert
