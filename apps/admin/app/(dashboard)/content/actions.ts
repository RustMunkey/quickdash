"use server"

import { db } from "@quickdash/db/client"
import * as schema from "@quickdash/db/schema"
import { eq, desc, and, ilike, count, inArray } from "@quickdash/db/drizzle"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireContentPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage content")
	}
	return workspace
}

// --- BLOG POSTS ---
interface GetBlogPostsParams {
	page?: number
	pageSize?: number
	status?: string
}

export async function getBlogPosts(params: GetBlogPostsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25, status } = params
	const offset = (page - 1) * pageSize

	const conditions = [eq(schema.blogPosts.workspaceId, workspace.id)]
	if (status && status !== "all") {
		conditions.push(eq(schema.blogPosts.status, status))
	}

	const where = and(...conditions)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.blogPosts)
			.where(where)
			.orderBy(desc(schema.blogPosts.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.blogPosts).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getBlogPost(id: string) {
	const workspace = await requireWorkspace()
	const [post] = await db
		.select()
		.from(schema.blogPosts)
		.where(and(eq(schema.blogPosts.id, id), eq(schema.blogPosts.workspaceId, workspace.id)))
	return post ?? null
}

export async function createBlogPost(data: {
	title: string
	slug: string
	excerpt?: string
	content?: string
	coverImage?: string
	status?: string
	metaTitle?: string
	metaDescription?: string
	tags?: string[]
}) {
	const workspace = await requireContentPermission()
	const [post] = await db
		.insert(schema.blogPosts)
		.values({
			workspaceId: workspace.id,
			title: data.title,
			slug: data.slug,
			excerpt: data.excerpt || undefined,
			content: data.content || undefined,
			coverImage: data.coverImage || undefined,
			status: data.status || "draft",
			publishedAt: data.status === "published" ? new Date() : undefined,
			metaTitle: data.metaTitle || undefined,
			metaDescription: data.metaDescription || undefined,
			tags: data.tags || [],
		})
		.returning()
	return post
}

export async function updateBlogPost(id: string, data: {
	title?: string
	slug?: string
	excerpt?: string
	content?: string
	coverImage?: string
	status?: string
	metaTitle?: string
	metaDescription?: string
	tags?: string[]
}) {
	const workspace = await requireContentPermission()
	const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() }
	if (data.status === "published" && !updateData.publishedAt) {
		updateData.publishedAt = new Date()
	}
	const [post] = await db
		.update(schema.blogPosts)
		.set(updateData)
		.where(and(eq(schema.blogPosts.id, id), eq(schema.blogPosts.workspaceId, workspace.id)))
		.returning()
	return post
}

export async function deleteBlogPost(id: string) {
	const workspace = await requireContentPermission()
	await db.delete(schema.blogPosts).where(and(eq(schema.blogPosts.id, id), eq(schema.blogPosts.workspaceId, workspace.id)))
}

export async function bulkDeleteBlogPosts(ids: string[]) {
	const workspace = await requireContentPermission()
	await db.delete(schema.blogPosts).where(and(inArray(schema.blogPosts.id, ids), eq(schema.blogPosts.workspaceId, workspace.id)))
}

// --- SITE PAGES ---
interface GetSitePagesParams {
	page?: number
	pageSize?: number
}

export async function getSitePages(params: GetSitePagesParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(schema.sitePages.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select()
			.from(schema.sitePages)
			.where(where)
			.orderBy(desc(schema.sitePages.updatedAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(schema.sitePages).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getSitePage(id: string) {
	const workspace = await requireWorkspace()
	const [page] = await db
		.select()
		.from(schema.sitePages)
		.where(and(eq(schema.sitePages.id, id), eq(schema.sitePages.workspaceId, workspace.id)))
	return page ?? null
}

export async function createSitePage(data: {
	title: string
	slug: string
	content?: string
	status?: string
	metaTitle?: string
	metaDescription?: string
}) {
	const workspace = await requireContentPermission()
	const [page] = await db
		.insert(schema.sitePages)
		.values({
			workspaceId: workspace.id,
			title: data.title,
			slug: data.slug,
			content: data.content || undefined,
			status: data.status || "draft",
			metaTitle: data.metaTitle || undefined,
			metaDescription: data.metaDescription || undefined,
		})
		.returning()
	return page
}

export async function updateSitePage(id: string, data: {
	title?: string
	slug?: string
	content?: string
	status?: string
	metaTitle?: string
	metaDescription?: string
}) {
	const workspace = await requireContentPermission()
	const [page] = await db
		.update(schema.sitePages)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(schema.sitePages.id, id), eq(schema.sitePages.workspaceId, workspace.id)))
		.returning()
	return page
}

export async function deleteSitePage(id: string) {
	const workspace = await requireContentPermission()
	await db.delete(schema.sitePages).where(and(eq(schema.sitePages.id, id), eq(schema.sitePages.workspaceId, workspace.id)))
}

export async function bulkDeleteSitePages(ids: string[]) {
	const workspace = await requireContentPermission()
	await db.delete(schema.sitePages).where(and(inArray(schema.sitePages.id, ids), eq(schema.sitePages.workspaceId, workspace.id)))
}

// --- SITE CONTENT ---
export async function getSiteContent() {
	const workspace = await requireWorkspace()
	return db
		.select()
		.from(schema.siteContent)
		.where(eq(schema.siteContent.workspaceId, workspace.id))
		.orderBy(schema.siteContent.key)
}

export async function updateSiteContent(key: string, value: string) {
	const workspace = await requireContentPermission()
	const [existing] = await db
		.select()
		.from(schema.siteContent)
		.where(and(eq(schema.siteContent.key, key), eq(schema.siteContent.workspaceId, workspace.id)))

	if (existing) {
		await db
			.update(schema.siteContent)
			.set({ value, updatedAt: new Date() })
			.where(and(eq(schema.siteContent.key, key), eq(schema.siteContent.workspaceId, workspace.id)))
	} else {
		await db
			.insert(schema.siteContent)
			.values({ key, value, type: "text", workspaceId: workspace.id })
	}
}

// --- MEDIA LIBRARY ---
export async function getMediaItems(params?: { type?: string; folder?: string }) {
	const workspace = await requireWorkspace()
	const conditions = [eq(schema.mediaItems.workspaceId, workspace.id)]
	if (params?.type === "image") {
		conditions.push(ilike(schema.mediaItems.mimeType, "image/%"))
	} else if (params?.type === "video") {
		conditions.push(ilike(schema.mediaItems.mimeType, "video/%"))
	}
	if (params?.folder) {
		conditions.push(eq(schema.mediaItems.folder, params.folder))
	}

	return db
		.select()
		.from(schema.mediaItems)
		.where(and(...conditions))
		.orderBy(desc(schema.mediaItems.createdAt))
}

export async function createMediaItem(data: {
	url: string
	filename: string
	mimeType?: string
	size?: number
	alt?: string
	folder?: string
}) {
	const workspace = await requireContentPermission()
	const [item] = await db
		.insert(schema.mediaItems)
		.values({ ...data, workspaceId: workspace.id })
		.returning()
	return item
}

export async function updateMediaItem(id: string, data: { alt?: string; folder?: string }) {
	const workspace = await requireContentPermission()
	const [item] = await db
		.update(schema.mediaItems)
		.set(data)
		.where(and(eq(schema.mediaItems.id, id), eq(schema.mediaItems.workspaceId, workspace.id)))
		.returning()
	return item
}

export async function deleteMediaItem(id: string) {
	const workspace = await requireContentPermission()
	await db.delete(schema.mediaItems).where(and(eq(schema.mediaItems.id, id), eq(schema.mediaItems.workspaceId, workspace.id)))
}
