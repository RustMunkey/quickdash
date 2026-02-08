import {
	pgTable,
	text,
	uuid,
	timestamp,
	decimal,
	integer,
	boolean,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

// Companies (B2B accounts)
export const crmCompanies = pgTable(
	"crm_companies",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		website: text("website"),
		industry: text("industry"),
		size: text("size"), // e.g., "1-10", "11-50", "51-200", "201-500", "500+"
		phone: text("phone"),
		email: text("email"),
		address: text("address"),
		city: text("city"),
		state: text("state"),
		country: text("country"),
		postalCode: text("postal_code"),
		annualRevenue: decimal("annual_revenue", { precision: 12, scale: 2 }),
		notes: text("notes"),
		tags: jsonb("tags").$type<string[]>().default([]),
		ownerId: text("owner_id").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_companies_workspace_idx").on(table.workspaceId),
	]
);

// Contacts (leads, prospects, customers)
export const crmContacts = pgTable(
	"crm_contacts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		email: text("email"),
		phone: text("phone"),
		mobile: text("mobile"),
		jobTitle: text("job_title"),
		companyId: uuid("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
		// Link to existing customer if they've made purchases
		customerId: text("customer_id").references(() => users.id, { onDelete: "set null" }),
		status: text("status").notNull().default("lead"), // lead, qualified, customer, churned
		source: text("source"), // website, referral, cold_outreach, event, etc.
		address: text("address"),
		city: text("city"),
		state: text("state"),
		country: text("country"),
		postalCode: text("postal_code"),
		notes: text("notes"),
		tags: jsonb("tags").$type<string[]>().default([]),
		ownerId: text("owner_id").references(() => users.id),
		lastContactedAt: timestamp("last_contacted_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_contacts_workspace_idx").on(table.workspaceId),
	]
);

// Pipeline stages (configurable per workspace)
export const crmPipelineStages = pgTable(
	"crm_pipeline_stages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		order: integer("order").notNull().default(0),
		color: text("color").notNull().default("#6b7280"),
		probability: integer("probability").notNull().default(0), // 0-100
		isDefault: boolean("is_default").default(false),
		isWon: boolean("is_won").default(false),
		isLost: boolean("is_lost").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_pipeline_stages_workspace_idx").on(table.workspaceId),
	]
);

// Deals (opportunities)
export const crmDeals = pgTable(
	"crm_deals",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		value: decimal("value", { precision: 12, scale: 2 }),
		currency: text("currency").default("USD"),
		contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
		companyId: uuid("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
		stageId: uuid("stage_id").references(() => crmPipelineStages.id, { onDelete: "set null" }),
		probability: integer("probability").default(0),
		expectedCloseDate: timestamp("expected_close_date"),
		actualCloseDate: timestamp("actual_close_date"),
		lostReason: text("lost_reason"),
		notes: text("notes"),
		tags: jsonb("tags").$type<string[]>().default([]),
		ownerId: text("owner_id").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_deals_workspace_idx").on(table.workspaceId),
	]
);

// Activities (calls, emails, meetings, notes)
export const crmActivities = pgTable(
	"crm_activities",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		type: text("type").notNull(), // call, email, meeting, note, task
		subject: text("subject"),
		body: text("body"),
		contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
		companyId: uuid("company_id").references(() => crmCompanies.id, { onDelete: "cascade" }),
		dealId: uuid("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
		// For calls
		duration: integer("duration"), // in seconds
		callOutcome: text("call_outcome"), // connected, voicemail, no_answer, busy
		// For meetings
		meetingLocation: text("meeting_location"),
		meetingStartTime: timestamp("meeting_start_time"),
		meetingEndTime: timestamp("meeting_end_time"),
		// For emails
		emailDirection: text("email_direction"), // inbound, outbound
		// Metadata
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
		createdBy: text("created_by").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_activities_workspace_idx").on(table.workspaceId),
	]
);

// Tasks (follow-ups, reminders)
export const crmTasks = pgTable(
	"crm_tasks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		dueDate: timestamp("due_date"),
		priority: text("priority").default("medium"), // low, medium, high, urgent
		status: text("status").default("pending"), // pending, in_progress, completed, canceled
		contactId: uuid("contact_id").references(() => crmContacts.id, { onDelete: "cascade" }),
		companyId: uuid("company_id").references(() => crmCompanies.id, { onDelete: "cascade" }),
		dealId: uuid("deal_id").references(() => crmDeals.id, { onDelete: "cascade" }),
		assignedTo: text("assigned_to").references(() => users.id),
		completedAt: timestamp("completed_at"),
		createdBy: text("created_by").references(() => users.id),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("crm_tasks_workspace_idx").on(table.workspaceId),
	]
);

// Contact-to-deal many-to-many (a deal can have multiple contacts)
export const crmDealContacts = pgTable("crm_deal_contacts", {
	id: uuid("id").primaryKey().defaultRandom(),
	dealId: uuid("deal_id").notNull().references(() => crmDeals.id, { onDelete: "cascade" }),
	contactId: uuid("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
	role: text("role"), // decision_maker, influencer, champion, etc.
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
