"use server"

import { eq, desc, sql, count, and, like, or, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { crmContacts, crmCompanies } from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

// --- CONTACTS ---

interface GetContactsParams {
	page?: number
	pageSize?: number
	search?: string
	status?: string
}

export async function getContacts(params: GetContactsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search, status } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(crmContacts.workspaceId, workspace.id)]
	if (search) {
		conditions.push(
			sql`(${crmContacts.firstName} ILIKE ${`%${search}%`} OR ${crmContacts.lastName} ILIKE ${`%${search}%`} OR ${crmContacts.email} ILIKE ${`%${search}%`})`
		)
	}
	if (status && status !== "all") {
		conditions.push(eq(crmContacts.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: crmContacts.id,
				firstName: crmContacts.firstName,
				lastName: crmContacts.lastName,
				email: crmContacts.email,
				phone: crmContacts.phone,
				jobTitle: crmContacts.jobTitle,
				status: crmContacts.status,
				source: crmContacts.source,
				companyId: crmContacts.companyId,
				tags: crmContacts.tags,
				createdAt: crmContacts.createdAt,
				companyName: crmCompanies.name,
			})
			.from(crmContacts)
			.leftJoin(crmCompanies, eq(crmContacts.companyId, crmCompanies.id))
			.where(where)
			.orderBy(desc(crmContacts.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(crmContacts).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function createContact(data: {
	firstName: string
	lastName: string
	email?: string
	phone?: string
	jobTitle?: string
	companyId?: string
	status?: string
	source?: string
}) {
	const workspace = await requireWorkspace()

	const [contact] = await db
		.insert(crmContacts)
		.values({
			workspaceId: workspace.id,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email || undefined,
			phone: data.phone || undefined,
			jobTitle: data.jobTitle || undefined,
			companyId: data.companyId || undefined,
			status: data.status || "lead",
			source: data.source || undefined,
		})
		.returning()

	return contact
}

export async function deleteContact(id: string) {
	const workspace = await requireWorkspace()

	await db
		.delete(crmContacts)
		.where(and(eq(crmContacts.id, id), eq(crmContacts.workspaceId, workspace.id)))
}

export async function bulkDeleteContacts(ids: string[]) {
	const workspace = await requireWorkspace()

	await db
		.delete(crmContacts)
		.where(and(inArray(crmContacts.id, ids), eq(crmContacts.workspaceId, workspace.id)))
}

// --- COMPANIES ---

interface GetCompaniesParams {
	page?: number
	pageSize?: number
	search?: string
	industry?: string
}

export async function getCompanies(params: GetCompaniesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search, industry } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(crmCompanies.workspaceId, workspace.id)]
	if (search) {
		conditions.push(
			sql`(${crmCompanies.name} ILIKE ${`%${search}%`} OR ${crmCompanies.email} ILIKE ${`%${search}%`})`
		)
	}
	if (industry && industry !== "all") {
		conditions.push(eq(crmCompanies.industry, industry))
	}

	const where = and(...conditions)

	const contactCountSubquery = db
		.select({
			companyId: crmContacts.companyId,
			contactCount: count().as("contact_count"),
		})
		.from(crmContacts)
		.where(eq(crmContacts.workspaceId, workspace.id))
		.groupBy(crmContacts.companyId)
		.as("contact_counts")

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: crmCompanies.id,
				name: crmCompanies.name,
				website: crmCompanies.website,
				industry: crmCompanies.industry,
				size: crmCompanies.size,
				phone: crmCompanies.phone,
				email: crmCompanies.email,
				annualRevenue: crmCompanies.annualRevenue,
				tags: crmCompanies.tags,
				createdAt: crmCompanies.createdAt,
				contactCount: sql<number>`COALESCE(${contactCountSubquery.contactCount}, 0)`.as("contact_count"),
			})
			.from(crmCompanies)
			.leftJoin(contactCountSubquery, eq(crmCompanies.id, contactCountSubquery.companyId))
			.where(where)
			.orderBy(desc(crmCompanies.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(crmCompanies).where(where),
	])

	return { items, totalCount: Number(total.count) }
}

export async function createCompany(data: {
	name: string
	website?: string
	industry?: string
	size?: string
	phone?: string
	email?: string
}) {
	const workspace = await requireWorkspace()

	const [company] = await db
		.insert(crmCompanies)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			website: data.website || undefined,
			industry: data.industry || undefined,
			size: data.size || undefined,
			phone: data.phone || undefined,
			email: data.email || undefined,
		})
		.returning()

	return company
}

export async function deleteCompany(id: string) {
	const workspace = await requireWorkspace()

	await db
		.delete(crmCompanies)
		.where(and(eq(crmCompanies.id, id), eq(crmCompanies.workspaceId, workspace.id)))
}

export async function bulkDeleteCompanies(ids: string[]) {
	const workspace = await requireWorkspace()

	await db
		.delete(crmCompanies)
		.where(and(inArray(crmCompanies.id, ids), eq(crmCompanies.workspaceId, workspace.id)))
}
