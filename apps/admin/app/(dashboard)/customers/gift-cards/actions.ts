"use server"

import { eq, desc, count, and, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { giftCards, giftCardTransactions, users } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireGiftCardsPermission() {
	const workspace = await requireWorkspace()
	const canManage = await checkWorkspacePermission("canManageCustomers")
	if (!canManage) {
		throw new Error("You don't have permission to manage gift cards")
	}
	return workspace
}

function generateCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	let code = ""
	for (let i = 0; i < 16; i++) {
		if (i > 0 && i % 4 === 0) code += "-"
		code += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return code
}

interface GetGiftCardsParams {
	page?: number
	pageSize?: number
}

export async function getGiftCards(params: GetGiftCardsParams = {}) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params
	const offset = (page - 1) * pageSize

	const where = eq(giftCards.workspaceId, workspace.id)

	const [items, [total]] = await Promise.all([
		db
			.select({
				id: giftCards.id,
				code: giftCards.code,
				initialBalance: giftCards.initialBalance,
				currentBalance: giftCards.currentBalance,
				issuedTo: giftCards.issuedTo,
				issuedBy: giftCards.issuedBy,
				status: giftCards.status,
				expiresAt: giftCards.expiresAt,
				createdAt: giftCards.createdAt,
			})
			.from(giftCards)
			.where(where)
			.orderBy(desc(giftCards.createdAt))
			.limit(pageSize)
			.offset(offset),
		db.select({ count: count() }).from(giftCards).where(where),
	])

	return { items, totalCount: total.count }
}

export async function getGiftCard(id: string) {
	const workspace = await requireWorkspace()
	const [card] = await db
		.select()
		.from(giftCards)
		.where(and(eq(giftCards.id, id), eq(giftCards.workspaceId, workspace.id)))
		.limit(1)

	if (!card) throw new Error("Gift card not found")

	const transactions = await db
		.select()
		.from(giftCardTransactions)
		.where(eq(giftCardTransactions.giftCardId, id))
		.orderBy(desc(giftCardTransactions.createdAt))

	// Get issued to user info
	let issuedToUser = null
	if (card.issuedTo) {
		const [user] = await db
			.select({ name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, card.issuedTo))
			.limit(1)
		issuedToUser = user ?? null
	}

	// Get issued by user info
	const [issuedByUser] = await db
		.select({ name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, card.issuedBy))
		.limit(1)

	return {
		...card,
		transactions,
		issuedToUser,
		issuedByUser: issuedByUser ?? null,
	}
}

interface CreateGiftCardData {
	initialBalance: string
	issuedTo?: string
	expiresAt?: string
}

export async function createGiftCard(data: CreateGiftCardData) {
	const workspace = await requireGiftCardsPermission()

	const code = generateCode()
	const balance = parseFloat(data.initialBalance)
	if (isNaN(balance) || balance <= 0) {
		throw new Error("Invalid balance amount")
	}

	const [card] = await db
		.insert(giftCards)
		.values({
			workspaceId: workspace.id,
			code,
			initialBalance: data.initialBalance,
			currentBalance: data.initialBalance,
			issuedTo: data.issuedTo || null,
			issuedBy: workspace.userId,
			expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
		})
		.returning()

	// Record issued transaction
	await db.insert(giftCardTransactions).values({
		giftCardId: card.id,
		type: "issued",
		amount: data.initialBalance,
	})

	await logAudit({
		action: "gift_card.created",
		targetType: "gift_card",
		targetId: card.id,
		targetLabel: `${code} - $${data.initialBalance}`,
	})

	return card
}

export async function bulkDeleteGiftCards(ids: string[]) {
	const workspace = await requireGiftCardsPermission()
	await db.delete(giftCards).where(and(inArray(giftCards.id, ids), eq(giftCards.workspaceId, workspace.id)))
}

export async function deactivateGiftCard(id: string) {
	const workspace = await requireGiftCardsPermission()

	const [card] = await db
		.update(giftCards)
		.set({ status: "deactivated" })
		.where(and(eq(giftCards.id, id), eq(giftCards.workspaceId, workspace.id)))
		.returning()

	if (!card) throw new Error("Gift card not found")

	await db.insert(giftCardTransactions).values({
		giftCardId: id,
		type: "deactivated",
		amount: "0",
	})

	await logAudit({
		action: "gift_card.deactivated",
		targetType: "gift_card",
		targetId: id,
		targetLabel: card.code,
	})

	return card
}
