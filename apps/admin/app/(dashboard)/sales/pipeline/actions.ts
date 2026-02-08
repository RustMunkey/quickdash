"use server"

import { eq, desc, asc, count, and, sql } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { crmPipelineStages, crmDeals, crmContacts, crmCompanies } from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

export async function getPipelineData() {
	const workspace = await requireWorkspace()

	const stages = await db
		.select()
		.from(crmPipelineStages)
		.where(eq(crmPipelineStages.workspaceId, workspace.id))
		.orderBy(asc(crmPipelineStages.order))

	// If no stages, create defaults
	if (stages.length === 0) {
		const defaults = [
			{ name: "Lead", order: 0, color: "#64748b", probability: 10 },
			{ name: "Qualified", order: 1, color: "#3b82f6", probability: 25 },
			{ name: "Proposal", order: 2, color: "#eab308", probability: 50 },
			{ name: "Negotiation", order: 3, color: "#f97316", probability: 75 },
			{ name: "Won", order: 4, color: "#22c55e", probability: 100, isWon: true },
			{ name: "Lost", order: 5, color: "#ef4444", probability: 0, isLost: true },
		]

		const created = await db
			.insert(crmPipelineStages)
			.values(defaults.map((d) => ({ ...d, workspaceId: workspace.id })))
			.returning()

		return { stages: created, deals: [] }
	}

	const deals = await db
		.select({
			id: crmDeals.id,
			title: crmDeals.title,
			value: crmDeals.value,
			stageId: crmDeals.stageId,
			contactId: crmDeals.contactId,
			companyId: crmDeals.companyId,
			expectedCloseDate: crmDeals.expectedCloseDate,
			notes: crmDeals.notes,
			createdAt: crmDeals.createdAt,
			contactName: crmContacts.firstName,
			contactLastName: crmContacts.lastName,
			companyName: crmCompanies.name,
		})
		.from(crmDeals)
		.leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
		.leftJoin(crmCompanies, eq(crmDeals.companyId, crmCompanies.id))
		.where(eq(crmDeals.workspaceId, workspace.id))
		.orderBy(desc(crmDeals.createdAt))

	return { stages, deals }
}

export async function moveDeal(dealId: string, stageId: string) {
	const workspace = await requireWorkspace()
	await db
		.update(crmDeals)
		.set({ stageId, updatedAt: new Date() })
		.where(and(eq(crmDeals.id, dealId), eq(crmDeals.workspaceId, workspace.id)))
}

export async function createDeal(data: {
	title: string
	value?: string
	stageId: string
	contactId?: string
	companyId?: string
}) {
	const workspace = await requireWorkspace()

	const [deal] = await db
		.insert(crmDeals)
		.values({
			workspaceId: workspace.id,
			title: data.title,
			value: data.value || null,
			stageId: data.stageId,
			contactId: data.contactId || null,
			companyId: data.companyId || null,
		})
		.returning()

	return deal
}

export async function updateDeal(dealId: string, data: {
	title?: string
	value?: string | null
	stageId?: string
	expectedCloseDate?: string | null
	notes?: string | null
}) {
	const workspace = await requireWorkspace()

	await db
		.update(crmDeals)
		.set({
			...(data.title !== undefined && { title: data.title }),
			...(data.value !== undefined && { value: data.value }),
			...(data.stageId !== undefined && { stageId: data.stageId }),
			...(data.expectedCloseDate !== undefined && {
				expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
			}),
			...(data.notes !== undefined && { notes: data.notes }),
			updatedAt: new Date(),
		})
		.where(and(eq(crmDeals.id, dealId), eq(crmDeals.workspaceId, workspace.id)))
}

export async function deleteDeal(dealId: string) {
	const workspace = await requireWorkspace()

	await db
		.delete(crmDeals)
		.where(and(eq(crmDeals.id, dealId), eq(crmDeals.workspaceId, workspace.id)))
}
