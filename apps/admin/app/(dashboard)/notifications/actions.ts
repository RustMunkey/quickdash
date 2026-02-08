"use server"

import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, desc, count, and } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireNotificationsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage notifications")
	}
	return workspace
}

// --- EMAIL TEMPLATES ---
interface GetEmailTemplatesParams {
	page?: number
	pageSize?: number
}

export async function getEmailTemplates(params: GetEmailTemplatesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.emailTemplates.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.emailTemplates)
			.where(where)
			.orderBy(schema.emailTemplates.name)
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.emailTemplates).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getEmailTemplate(id: string) {
	const workspace = await requireWorkspace()
	const [template] = await db
		.select()
		.from(schema.emailTemplates)
		.where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
	return template ?? null
}

export async function createEmailTemplate(data: {
	name: string
	slug: string
	subject: string
	body?: string
	variables?: string[]
}) {
	const workspace = await requireNotificationsPermission()
	const [template] = await db
		.insert(schema.emailTemplates)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			slug: data.slug,
			subject: data.subject,
			body: data.body || undefined,
			variables: data.variables || [],
		})
		.returning()
	return template
}

export async function updateEmailTemplate(id: string, data: {
	name?: string
	slug?: string
	subject?: string
	body?: string
	variables?: string[]
	isActive?: boolean
}) {
	const workspace = await requireNotificationsPermission()
	const [template] = await db
		.update(schema.emailTemplates)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
		.returning()
	return template
}

export async function toggleTemplate(id: string, isActive: boolean) {
	const workspace = await requireNotificationsPermission()
	await db
		.update(schema.emailTemplates)
		.set({ isActive, updatedAt: new Date() })
		.where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
}

export async function deleteEmailTemplate(id: string) {
	const workspace = await requireNotificationsPermission()
	await db.delete(schema.emailTemplates).where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
}

// --- MESSAGES ---
interface GetMessagesParams {
	page?: number
	pageSize?: number
}

export async function getMessages(params: GetMessagesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.messages.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.messages)
			.where(where)
			.orderBy(desc(schema.messages.sentAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.messages).where(where),
	])

	return { items, totalCount: total.count }
}

export async function createMessage(data: {
	templateId?: string
	recipientEmail: string
	subject: string
	body?: string
}) {
	const workspace = await requireNotificationsPermission()
	const [message] = await db
		.insert(schema.messages)
		.values({ ...data, workspaceId: workspace.id })
		.returning()
	return message
}

// --- ALERT RULES ---
export async function getAlertRules() {
	const workspace = await requireWorkspace()
	return db
		.select()
		.from(schema.alertRules)
		.where(eq(schema.alertRules.workspaceId, workspace.id))
		.orderBy(schema.alertRules.name)
}

export async function createAlertRule(data: {
	name: string
	type: string
	channel: string
	threshold?: number
	recipients?: string[]
}) {
	const workspace = await requireNotificationsPermission()
	const [rule] = await db
		.insert(schema.alertRules)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			type: data.type,
			channel: data.channel,
			threshold: data.threshold || undefined,
			recipients: data.recipients || [],
		})
		.returning()
	return rule
}

export async function updateAlertRule(id: string, data: {
	name?: string
	type?: string
	channel?: string
	threshold?: number
	isActive?: boolean
	recipients?: string[]
}) {
	const workspace = await requireNotificationsPermission()
	const [rule] = await db
		.update(schema.alertRules)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(schema.alertRules.id, id), eq(schema.alertRules.workspaceId, workspace.id)))
		.returning()
	return rule
}

export async function toggleAlertRule(id: string, isActive: boolean) {
	const workspace = await requireNotificationsPermission()
	await db
		.update(schema.alertRules)
		.set({ isActive, updatedAt: new Date() })
		.where(and(eq(schema.alertRules.id, id), eq(schema.alertRules.workspaceId, workspace.id)))
}

export async function deleteAlertRule(id: string) {
	const workspace = await requireNotificationsPermission()
	await db.delete(schema.alertRules).where(and(eq(schema.alertRules.id, id), eq(schema.alertRules.workspaceId, workspace.id)))
}
