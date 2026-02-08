"use server"

import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, desc, sql, ilike, and, or, isNull, isNotNull, count, inArray } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireMarketingPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage marketing")
	}
	return workspace
}

// --- DISCOUNTS ---
interface GetDiscountsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getDiscounts(params: GetDiscountsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace
	const conditions = [eq(schema.discounts.workspaceId, workspace.id)]
	if (status === "active") {
		conditions.push(eq(schema.discounts.isActive, true))
	} else if (status === "inactive") {
		conditions.push(eq(schema.discounts.isActive, false))
	} else if (status === "expired") {
		conditions.push(sql`${schema.discounts.expiresAt} < NOW()`)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.discounts)
			.where(where)
			.orderBy(desc(schema.discounts.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.discounts).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getDiscount(id: string) {
	const workspace = await requireWorkspace()
	const [discount] = await db
		.select()
		.from(schema.discounts)
		.where(and(eq(schema.discounts.id, id), eq(schema.discounts.workspaceId, workspace.id)))
	return discount ?? null
}

export async function createDiscount(data: {
	name: string
	code?: string
	discountType?: string
	valueType: string
	value: string
	minimumOrderAmount?: string
	maxUses?: number
	maxUsesPerUser?: number
	applicableCategories?: string[]
	isStackable?: boolean
	startsAt?: string
	expiresAt?: string
}) {
	const workspace = await requireMarketingPermission()
	const [discount] = await db
		.insert(schema.discounts)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			code: data.code || undefined,
			discountType: data.discountType || "code",
			valueType: data.valueType,
			value: data.value,
			minimumOrderAmount: data.minimumOrderAmount || undefined,
			maxUses: data.maxUses || undefined,
			maxUsesPerUser: data.maxUsesPerUser || 1,
			applicableCategories: data.applicableCategories || undefined,
			isStackable: data.isStackable || false,
			startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
			expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
		})
		.returning()
	return discount
}

export async function updateDiscount(id: string, data: Partial<{
	name: string
	code: string
	valueType: string
	value: string
	minimumOrderAmount: string | null
	maxUses: number | null
	isActive: boolean
	isStackable: boolean
	startsAt: string | null
	expiresAt: string | null
}>) {
	const workspace = await requireMarketingPermission()
	const updates: Record<string, unknown> = {}
	if (data.name !== undefined) updates.name = data.name
	if (data.code !== undefined) updates.code = data.code
	if (data.valueType !== undefined) updates.valueType = data.valueType
	if (data.value !== undefined) updates.value = data.value
	if (data.minimumOrderAmount !== undefined) updates.minimumOrderAmount = data.minimumOrderAmount
	if (data.maxUses !== undefined) updates.maxUses = data.maxUses
	if (data.isActive !== undefined) updates.isActive = data.isActive
	if (data.isStackable !== undefined) updates.isStackable = data.isStackable
	if (data.startsAt !== undefined) updates.startsAt = data.startsAt ? new Date(data.startsAt) : null
	if (data.expiresAt !== undefined) updates.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

	await db.update(schema.discounts).set(updates).where(and(eq(schema.discounts.id, id), eq(schema.discounts.workspaceId, workspace.id)))
}

export async function deleteDiscount(id: string) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.discounts).where(and(eq(schema.discounts.id, id), eq(schema.discounts.workspaceId, workspace.id)))
}

export async function bulkDeleteDiscounts(ids: string[]) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.discounts).where(and(inArray(schema.discounts.id, ids), eq(schema.discounts.workspaceId, workspace.id)))
}

export async function toggleDiscount(id: string, isActive: boolean) {
	const workspace = await requireMarketingPermission()
	await db.update(schema.discounts).set({ isActive }).where(and(eq(schema.discounts.id, id), eq(schema.discounts.workspaceId, workspace.id)))
}

// --- CAMPAIGNS ---
interface GetCampaignsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getCampaigns(params: GetCampaignsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	// Always filter by workspace
	const conditions = [eq(schema.campaigns.workspaceId, workspace.id)]
	if (status && status !== "all") {
		conditions.push(eq(schema.campaigns.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.campaigns)
			.where(where)
			.orderBy(desc(schema.campaigns.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.campaigns).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getCampaign(id: string) {
	const workspace = await requireWorkspace()
	const [campaign] = await db
		.select()
		.from(schema.campaigns)
		.where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.workspaceId, workspace.id)))
	return campaign ?? null
}

export async function createCampaign(data: {
	name: string
	description?: string
	type: string
	subject?: string
	content?: string
	audience?: string
	discountCode?: string
	scheduledAt?: string
}) {
	const workspace = await requireMarketingPermission()
	const [campaign] = await db
		.insert(schema.campaigns)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			description: data.description || undefined,
			type: data.type,
			subject: data.subject || undefined,
			content: data.content || undefined,
			audience: data.audience || "all",
			discountCode: data.discountCode || undefined,
			scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
			status: data.scheduledAt ? "scheduled" : "draft",
		})
		.returning()
	return campaign
}

export async function updateCampaignStatus(id: string, status: string) {
	const workspace = await requireMarketingPermission()
	const updates: Record<string, unknown> = { status }
	if (status === "active") updates.startedAt = new Date()
	if (status === "ended" || status === "cancelled") updates.endedAt = new Date()

	await db.update(schema.campaigns).set(updates).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.workspaceId, workspace.id)))
}

export async function deleteCampaign(id: string) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.workspaceId, workspace.id)))
}

export async function bulkDeleteCampaigns(ids: string[]) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.campaigns).where(and(inArray(schema.campaigns.id, ids), eq(schema.campaigns.workspaceId, workspace.id)))
}

// --- REFERRALS ---
interface GetReferralsParams {
	page?: number
	pageSize?: number
}

export async function getReferrals(params: GetReferralsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.referrals.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: schema.referrals.id,
				referrerId: schema.referrals.referrerId,
				referredId: schema.referrals.referredId,
				referralCode: schema.referrals.referralCode,
				status: schema.referrals.status,
				rewardAmount: schema.referrals.rewardAmount,
				rewardType: schema.referrals.rewardType,
				completedAt: schema.referrals.completedAt,
				createdAt: schema.referrals.createdAt,
				referrerName: sql<string | null>`(SELECT name FROM users WHERE id = ${schema.referrals.referrerId})`,
				referrerEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${schema.referrals.referrerId})`,
				referredName: sql<string | null>`(SELECT name FROM users WHERE id = ${schema.referrals.referredId})`,
				referredEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${schema.referrals.referredId})`,
			})
			.from(schema.referrals)
			.where(where)
			.orderBy(desc(schema.referrals.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.referrals).where(where),
	])

	return { items, totalCount: total.count }
}

interface GetReferralCodesParams {
	page?: number
	pageSize?: number
}

export async function getReferralCodes(params: GetReferralCodesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.referralCodes.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: schema.referralCodes.id,
				userId: schema.referralCodes.userId,
				code: schema.referralCodes.code,
				totalReferrals: schema.referralCodes.totalReferrals,
				totalEarnings: schema.referralCodes.totalEarnings,
				createdAt: schema.referralCodes.createdAt,
				userName: sql<string | null>`(SELECT name FROM users WHERE id = ${schema.referralCodes.userId})`,
				userEmail: sql<string | null>`(SELECT email FROM users WHERE id = ${schema.referralCodes.userId})`,
			})
			.from(schema.referralCodes)
			.where(where)
			.orderBy(desc(schema.referralCodes.totalReferrals))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.referralCodes).where(where),
	])

	return { items, totalCount: total.count }
}

export async function bulkDeleteReferrals(ids: string[]) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.referrals).where(and(inArray(schema.referrals.id, ids), eq(schema.referrals.workspaceId, workspace.id)))
}

export async function bulkDeleteReferralCodes(ids: string[]) {
	const workspace = await requireMarketingPermission()
	await db.delete(schema.referralCodes).where(and(inArray(schema.referralCodes.id, ids), eq(schema.referralCodes.workspaceId, workspace.id)))
}

// --- SEO ---
export async function getProductsSeo(params?: { page?: number; pageSize?: number }) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params ?? {}
	const offset = (page - 1) * pageSize

	const whereClause = eq(schema.products.workspaceId, workspace.id)

	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: schema.products.id,
				name: schema.products.name,
				slug: schema.products.slug,
				metaTitle: schema.products.metaTitle,
				metaDescription: schema.products.metaDescription,
				isActive: schema.products.isActive,
			})
			.from(schema.products)
			.where(whereClause)
			.orderBy(schema.products.name)
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(schema.products)
			.where(whereClause),
	])

	return { items, totalCount: countResult.count }
}

export async function bulkClearProductSeo(ids: string[]) {
	const workspace = await requireMarketingPermission()
	await db
		.update(schema.products)
		.set({ metaTitle: null, metaDescription: null })
		.where(and(inArray(schema.products.id, ids), eq(schema.products.workspaceId, workspace.id)))
}

export async function updateProductSeo(id: string, data: { metaTitle: string | null; metaDescription: string | null }) {
	const workspace = await requireMarketingPermission()
	await db
		.update(schema.products)
		.set({ metaTitle: data.metaTitle, metaDescription: data.metaDescription })
		.where(and(eq(schema.products.id, id), eq(schema.products.workspaceId, workspace.id)))
}
