"use server"

import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import { storefronts } from "@quickdash/db/schema"
import { nanoid } from "nanoid"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"
import { logAudit } from "@/lib/audit"

async function requireStorefrontPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageSettings")
	if (!canManage) {
		throw new Error("You don't have permission to manage storefronts")
	}
	return workspace
}

export async function getStorefronts() {
	const workspace = await requireWorkspace()

	return db
		.select({
			id: storefronts.id,
			name: storefronts.name,
			domain: storefronts.domain,
			customDomain: storefronts.customDomain,
			apiKey: storefronts.apiKey,
			permissions: storefronts.permissions,
			isActive: storefronts.isActive,
			createdAt: storefronts.createdAt,
			updatedAt: storefronts.updatedAt,
		})
		.from(storefronts)
		.where(eq(storefronts.workspaceId, workspace.id))
		.orderBy(desc(storefronts.createdAt))
}

export async function getStorefront(id: string) {
	const workspace = await requireWorkspace()

	const [storefront] = await db
		.select()
		.from(storefronts)
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.limit(1)

	return storefront ?? null
}

interface CreateStorefrontData {
	name: string
	domain?: string
	permissions?: {
		products: boolean
		orders: boolean
		customers: boolean
		checkout: boolean
		inventory: boolean
	}
}

export async function createStorefront(data: CreateStorefrontData) {
	const workspace = await requireStorefrontPermission()

	// Generate API credentials
	const apiKey = `sf_${nanoid(32)}`
	const apiSecret = `sfs_${nanoid(48)}`

	const [storefront] = await db
		.insert(storefronts)
		.values({
			workspaceId: workspace.id,
			name: data.name,
			domain: data.domain || null,
			apiKey,
			apiSecret,
			permissions: data.permissions,
		})
		.returning()

	await logAudit({
		action: "storefront.created",
		targetType: "storefront",
		targetId: storefront.id,
		targetLabel: data.name,
	})

	return storefront
}

interface UpdateStorefrontData {
	name?: string
	domain?: string
	permissions?: {
		products: boolean
		orders: boolean
		customers: boolean
		checkout: boolean
		inventory: boolean
	}
	isActive?: boolean
}

export async function updateStorefront(id: string, data: UpdateStorefrontData) {
	const workspace = await requireStorefrontPermission()

	const [storefront] = await db
		.update(storefronts)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.returning()

	if (!storefront) throw new Error("Storefront not found")

	await logAudit({
		action: "storefront.updated",
		targetType: "storefront",
		targetId: id,
		targetLabel: storefront.name,
	})

	return storefront
}

export async function deleteStorefront(id: string) {
	const workspace = await requireStorefrontPermission()

	const [storefront] = await db
		.select({ name: storefronts.name })
		.from(storefronts)
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.limit(1)

	if (!storefront) throw new Error("Storefront not found")

	await db
		.delete(storefronts)
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))

	await logAudit({
		action: "storefront.deleted",
		targetType: "storefront",
		targetId: id,
		targetLabel: storefront.name,
	})
}

export async function regenerateApiKey(id: string) {
	const workspace = await requireStorefrontPermission()

	const newApiKey = `sf_${nanoid(32)}`

	const [storefront] = await db
		.update(storefronts)
		.set({
			apiKey: newApiKey,
			updatedAt: new Date(),
		})
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.returning()

	if (!storefront) throw new Error("Storefront not found")

	await logAudit({
		action: "storefront.api_key_regenerated",
		targetType: "storefront",
		targetId: id,
		targetLabel: storefront.name,
	})

	return newApiKey
}

export async function regenerateApiSecret(id: string) {
	const workspace = await requireStorefrontPermission()

	const newApiSecret = `sfs_${nanoid(48)}`

	const [storefront] = await db
		.update(storefronts)
		.set({
			apiSecret: newApiSecret,
			updatedAt: new Date(),
		})
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.returning()

	if (!storefront) throw new Error("Storefront not found")

	await logAudit({
		action: "storefront.api_secret_regenerated",
		targetType: "storefront",
		targetId: id,
		targetLabel: storefront.name,
	})

	return newApiSecret
}

export async function getApiSecret(id: string) {
	const workspace = await requireStorefrontPermission()

	const [storefront] = await db
		.select({ apiSecret: storefronts.apiSecret })
		.from(storefronts)
		.where(and(eq(storefronts.id, id), eq(storefronts.workspaceId, workspace.id)))
		.limit(1)

	if (!storefront) throw new Error("Storefront not found")

	return storefront.apiSecret
}
