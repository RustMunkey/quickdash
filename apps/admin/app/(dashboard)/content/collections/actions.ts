"use server"

import { db } from "@quickdash/db/client"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import type { CollectionSchema } from "@quickdash/db/schema"
import { eq, and, desc, asc, count, inArray, ilike, sql } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireContentPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage content")
	}
	return workspace
}

// --- COLLECTIONS ---

export async function getCollections() {
	const workspace = await requireWorkspace()

	const collections = await db
		.select({
			id: contentCollections.id,
			name: contentCollections.name,
			slug: contentCollections.slug,
			description: contentCollections.description,
			icon: contentCollections.icon,
			schema: contentCollections.schema,
			allowPublicSubmit: contentCollections.allowPublicSubmit,
			isActive: contentCollections.isActive,
			sortOrder: contentCollections.sortOrder,
			createdAt: contentCollections.createdAt,
		})
		.from(contentCollections)
		.where(eq(contentCollections.workspaceId, workspace.id))
		.orderBy(asc(contentCollections.sortOrder))

	// Get entry counts for each collection
	const entryCounts = await db
		.select({
			collectionId: contentEntries.collectionId,
			count: count(),
		})
		.from(contentEntries)
		.where(eq(contentEntries.workspaceId, workspace.id))
		.groupBy(contentEntries.collectionId)

	const countMap = new Map(entryCounts.map((c) => [c.collectionId, c.count]))

	return collections.map((c) => ({
		...c,
		entryCount: countMap.get(c.id) ?? 0,
	}))
}

export async function getCollection(slug: string) {
	const workspace = await requireWorkspace()
	const [collection] = await db
		.select()
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.workspaceId, workspace.id),
				eq(contentCollections.slug, slug)
			)
		)
		.limit(1)
	return collection ?? null
}

export async function createCollection(data: {
	name: string
	slug: string
	description?: string
	icon?: string
	schema: CollectionSchema
	allowPublicSubmit?: boolean
	publicSubmitStatus?: string
}) {
	const workspace = await requireContentPermission()

	// Get max sort order
	const [maxSort] = await db
		.select({ max: sql<number>`COALESCE(MAX(${contentCollections.sortOrder}), -1)` })
		.from(contentCollections)
		.where(eq(contentCollections.workspaceId, workspace.id))

	const [collection] = await db
		.insert(contentCollections)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			slug: data.slug,
			description: data.description || undefined,
			icon: data.icon || undefined,
			schema: data.schema,
			allowPublicSubmit: data.allowPublicSubmit ?? false,
			publicSubmitStatus: data.publicSubmitStatus || "inactive",
			sortOrder: (maxSort?.max ?? -1) + 1,
		})
		.returning()
	return collection
}

export async function updateCollection(id: string, data: {
	name?: string
	slug?: string
	description?: string
	icon?: string
	schema?: CollectionSchema
	allowPublicSubmit?: boolean
	publicSubmitStatus?: string
	isActive?: boolean
	sortOrder?: number
}) {
	const workspace = await requireContentPermission()
	const [collection] = await db
		.update(contentCollections)
		.set({ ...data, updatedAt: new Date() })
		.where(
			and(
				eq(contentCollections.id, id),
				eq(contentCollections.workspaceId, workspace.id)
			)
		)
		.returning()
	return collection
}

export async function deleteCollection(id: string) {
	const workspace = await requireContentPermission()
	await db
		.delete(contentCollections)
		.where(
			and(
				eq(contentCollections.id, id),
				eq(contentCollections.workspaceId, workspace.id)
			)
		)
}

// --- ENTRIES ---

interface GetEntriesParams {
	page?: number
	pageSize?: number
	search?: string
}

export async function getEntries(collectionId: string, params: GetEntriesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, search } = params
	const offset = (page - 1) * pageSize

	// Get collection to know the titleField
	const [collection] = await db
		.select({ schema: contentCollections.schema })
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.id, collectionId),
				eq(contentCollections.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!collection) {
		throw new Error("Collection not found")
	}

	const conditions = [
		eq(contentEntries.collectionId, collectionId),
		eq(contentEntries.workspaceId, workspace.id),
	]

	// Search on the titleField
	const schema = collection.schema as CollectionSchema
	if (search && search.trim()) {
		const titleKey = schema.settings.titleField
		conditions.push(
			sql`${contentEntries.data}->>${sql.raw(`'${titleKey.replace(/'/g, "''")}'`)} ILIKE ${'%' + search.trim() + '%'}`
		)
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(contentEntries)
			.where(where)
			.orderBy(asc(contentEntries.sortOrder), desc(contentEntries.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(contentEntries).where(where),
	])

	return { items, totalCount: total.count }
}

export async function createEntry(collectionId: string, data: Record<string, unknown>) {
	const workspace = await requireContentPermission()

	// Verify collection belongs to workspace
	const [collection] = await db
		.select({ id: contentCollections.id })
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.id, collectionId),
				eq(contentCollections.workspaceId, workspace.id)
			)
		)
		.limit(1)

	if (!collection) {
		throw new Error("Collection not found")
	}

	const [entry] = await db
		.insert(contentEntries)
		.values({
			collectionId,
			workspaceId: workspace.id,
			data,
		})
		.returning()
	return entry
}

export async function updateEntry(entryId: string, data: {
	data?: Record<string, unknown>
	isActive?: boolean
	sortOrder?: number
}) {
	const workspace = await requireContentPermission()
	const [entry] = await db
		.update(contentEntries)
		.set({ ...data, updatedAt: new Date() })
		.where(
			and(
				eq(contentEntries.id, entryId),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
		.returning()
	return entry
}

export async function deleteEntry(entryId: string) {
	const workspace = await requireContentPermission()
	await db
		.delete(contentEntries)
		.where(
			and(
				eq(contentEntries.id, entryId),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
}

export async function bulkDeleteEntries(ids: string[]) {
	const workspace = await requireContentPermission()
	await db
		.delete(contentEntries)
		.where(
			and(
				inArray(contentEntries.id, ids),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
}

export async function bulkToggleEntries(ids: string[], isActive: boolean) {
	const workspace = await requireContentPermission()
	await db
		.update(contentEntries)
		.set({ isActive, updatedAt: new Date() })
		.where(
			and(
				inArray(contentEntries.id, ids),
				eq(contentEntries.workspaceId, workspace.id)
			)
		)
}
