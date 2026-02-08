"use server"

import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, desc, count, and, inArray } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireEmailPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage email templates")
	}
	return workspace
}

// --- EMAIL TEMPLATES ---

export async function getEmailTemplates(params: { page?: number; pageSize?: number } = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.emailTemplates.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.emailTemplates)
			.where(where)
			.orderBy(desc(schema.emailTemplates.updatedAt))
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
	const workspace = await requireEmailPermission()
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
	const workspace = await requireEmailPermission()
	const [template] = await db
		.update(schema.emailTemplates)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
		.returning()
	return template
}

export async function toggleTemplate(id: string, isActive: boolean) {
	const workspace = await requireEmailPermission()
	await db
		.update(schema.emailTemplates)
		.set({ isActive, updatedAt: new Date() })
		.where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
}

export async function deleteEmailTemplate(id: string) {
	const workspace = await requireEmailPermission()
	await db.delete(schema.emailTemplates).where(and(eq(schema.emailTemplates.id, id), eq(schema.emailTemplates.workspaceId, workspace.id)))
}

export async function bulkDeleteEmailTemplates(ids: string[]) {
	const workspace = await requireEmailPermission()
	await db.delete(schema.emailTemplates).where(and(inArray(schema.emailTemplates.id, ids), eq(schema.emailTemplates.workspaceId, workspace.id)))
}

// --- CORE TEMPLATES (seed) ---

function coreTemplate(title: string, body: string) {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin: 0 0 16px; color: #18181b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .code { display: inline-block; padding: 12px 24px; background: #f4f4f5; border-radius: 8px; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #18181b; font-family: monospace; }
    .btn { display: inline-block; padding: 10px 24px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; }
    .footer { text-align: center; padding: 24px 0; font-size: 12px; color: #a1a1aa; }
    .muted { font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>${title}</h1>
${body}
    </div>
    <div class="footer">
      <p>&copy; {{year}} {{store_name}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
}

const CORE_TEMPLATES = [
	{
		name: "Confirm Email",
		slug: "confirm_email",
		subject: "Confirm your email address",
		variables: ["customer_name", "confirmation_url", "store_name", "year"],
		body: coreTemplate("Confirm Your Email", `      <p>Hi {{customer_name}},</p>
      <p>Thanks for signing up! Please confirm your email address by clicking the button below.</p>
      <p><a href="{{confirmation_url}}" class="btn">Confirm Email</a></p>
      <p class="muted">If you didn't create an account, you can safely ignore this email.</p>`),
	},
	{
		name: "Password Reset",
		slug: "password_reset",
		subject: "Reset your password",
		variables: ["customer_name", "reset_url", "store_name", "year"],
		body: coreTemplate("Reset Your Password", `      <p>Hi {{customer_name}},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p><a href="{{reset_url}}" class="btn">Reset Password</a></p>
      <p class="muted">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>`),
	},
	{
		name: "Verify OTP",
		slug: "verify_otp",
		subject: "Your verification code",
		variables: ["customer_name", "otp_code", "store_name", "year"],
		body: coreTemplate("Verification Code", `      <p>Hi {{customer_name}},</p>
      <p>Use the following code to verify your identity:</p>
      <p style="text-align: center; padding: 8px 0;"><span class="code">{{otp_code}}</span></p>
      <p class="muted">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>`),
	},
	{
		name: "Invite User",
		slug: "invite_user",
		subject: "You've been invited to join {{store_name}}",
		variables: ["inviter_name", "invite_url", "role", "store_name", "year"],
		body: coreTemplate("You're Invited", `      <p>{{inviter_name}} has invited you to join <strong>{{store_name}}</strong> as a <strong>{{role}}</strong>.</p>
      <p>Click the button below to accept the invitation and set up your account.</p>
      <p><a href="{{invite_url}}" class="btn">Accept Invite</a></p>
      <p class="muted">This invitation expires in 7 days.</p>`),
	},
	{
		name: "Change Email",
		slug: "change_email",
		subject: "Confirm your new email address",
		variables: ["customer_name", "new_email", "confirmation_url", "store_name", "year"],
		body: coreTemplate("Confirm Email Change", `      <p>Hi {{customer_name}},</p>
      <p>You requested to change your email address to <strong>{{new_email}}</strong>. Please confirm this change by clicking the button below.</p>
      <p><a href="{{confirmation_url}}" class="btn">Confirm New Email</a></p>
      <p class="muted">If you didn't request this change, please secure your account immediately.</p>`),
	},
]

export async function seedCoreTemplates() {
	const workspace = await requireWorkspace()

	// Check if workspace already has templates
	const [existing] = await db
		.select({ count: count() })
		.from(schema.emailTemplates)
		.where(eq(schema.emailTemplates.workspaceId, workspace.id))

	if (existing.count > 0) return false

	await db.insert(schema.emailTemplates).values(
		CORE_TEMPLATES.map((t) => ({
			workspaceId: workspace.id,
			name: t.name,
			slug: t.slug,
			subject: t.subject,
			body: t.body,
			variables: t.variables,
		}))
	)

	return true
}

// --- SENT LOG ---

export async function getSentMessages(params: { page?: number; pageSize?: number; templateId?: string } = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, templateId } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(schema.messages.workspaceId, workspace.id)]
	if (templateId) {
		conditions.push(eq(schema.messages.templateId, templateId))
	}

	const where = and(...conditions)

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
