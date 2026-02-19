"use server"

import { eq, and, count } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { categories } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { slugify } from "@/lib/format"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireCategoriesPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageProducts")
	if (!canManage) {
		throw new Error("You don't have permission to manage categories")
	}
	return workspace
}

export async function getAllCategories(params?: { page?: number; pageSize?: number }) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params ?? {}
	const offset = (page - 1) * pageSize

	const whereClause = eq(categories.workspaceId, workspace.id)

	const [items, [countResult]] = await Promise.all([
		db
			.select()
			.from(categories)
			.where(whereClause)
			.orderBy(categories.sortOrder)
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(categories)
			.where(whereClause),
	])

	return { items, totalCount: countResult.count }
}

export async function getCategory(id: string) {
	const workspace = await requireWorkspace()
	const [category] = await db
		.select()
		.from(categories)
		.where(and(eq(categories.id, id), eq(categories.workspaceId, workspace.id)))
		.limit(1)
	if (!category) throw new Error("Category not found")
	return category
}

interface CategoryData {
	name: string
	slug?: string
	description?: string
	parentId?: string
	sortOrder?: number
	image?: string
	isFeatured?: boolean
}

export async function createCategory(data: CategoryData) {
	const workspace = await requireCategoriesPermission()

	const slug = data.slug || slugify(data.name)

	const [category] = await db
		.insert(categories)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			slug,
			description: data.description || null,
			parentId: data.parentId || null,
			sortOrder: data.sortOrder ?? 0,
			image: data.image || null,
		isFeatured: data.isFeatured ?? false,
		})
		.returning()

	await logAudit({
		action: "category.created",
		targetType: "category",
		targetId: category.id,
		targetLabel: category.name,
	})

	return category
}

export async function updateCategory(id: string, data: Partial<CategoryData>) {
	const workspace = await requireCategoriesPermission()

	const updates: Record<string, unknown> = {}
	if (data.name !== undefined) updates.name = data.name
	if (data.slug !== undefined) updates.slug = data.slug
	if (data.description !== undefined) updates.description = data.description || null
	if (data.parentId !== undefined) updates.parentId = data.parentId || null
	if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
	if (data.image !== undefined) updates.image = data.image || null
	if (data.isFeatured !== undefined) updates.isFeatured = data.isFeatured

	const [category] = await db
		.update(categories)
		.set(updates)
		.where(and(eq(categories.id, id), eq(categories.workspaceId, workspace.id)))
		.returning()

	await logAudit({
		action: "category.updated",
		targetType: "category",
		targetId: id,
		targetLabel: category?.name,
	})

	return category
}

export async function deleteCategory(id: string) {
	const workspace = await requireCategoriesPermission()

	const [category] = await db
		.select({ name: categories.name })
		.from(categories)
		.where(and(eq(categories.id, id), eq(categories.workspaceId, workspace.id)))
		.limit(1)

	if (!category) throw new Error("Category not found")

	await db.delete(categories).where(and(eq(categories.id, id), eq(categories.workspaceId, workspace.id)))

	await logAudit({
		action: "category.deleted",
		targetType: "category",
		targetId: id,
		targetLabel: category?.name,
	})
}

export async function bulkDeleteCategories(ids: string[]) {
	const workspace = await requireCategoriesPermission()
	const { inArray } = await import("@quickdash/db/drizzle")

	await db
		.delete(categories)
		.where(and(eq(categories.workspaceId, workspace.id), inArray(categories.id, ids)))

	await logAudit({
		action: "category.bulk_deleted",
		targetType: "category",
		targetId: ids.join(","),
		targetLabel: `${ids.length} categories`,
	})
}
