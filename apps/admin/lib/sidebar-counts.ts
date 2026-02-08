"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { sql, eq, and, isNull, ne, or } from "@quickdash/db/drizzle"
import { teamMessages, teamMessageRecipients, calls, callParticipants, directMessages, dmConversations } from "@quickdash/db/schema"
import { auth } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"

export async function getSidebarBadgeCounts() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) return { messages: 0, calls: 0 }

	const userId = session.user.id
	let messageCount = 0
	let callCount = 0

	try {
		const workspace = await requireWorkspace()

		// Unread team messages
		const [teamResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(teamMessageRecipients)
			.innerJoin(teamMessages, eq(teamMessageRecipients.messageId, teamMessages.id))
			.where(
				and(
					eq(teamMessageRecipients.recipientId, userId),
					eq(teamMessages.workspaceId, workspace.id),
					isNull(teamMessageRecipients.readAt)
				)
			)
		messageCount += Number(teamResult?.count || 0)

		// Unread direct messages (not from self)
		const [dmResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(directMessages)
			.innerJoin(dmConversations, eq(directMessages.conversationId, dmConversations.id))
			.where(
				and(
					or(
						eq(dmConversations.participant1Id, userId),
						eq(dmConversations.participant2Id, userId)
					),
					ne(directMessages.senderId, userId),
					isNull(directMessages.readAt)
				)
			)
		messageCount += Number(dmResult?.count || 0)

		// Missed calls
		const [callResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(callParticipants)
			.innerJoin(calls, eq(calls.id, callParticipants.callId))
			.where(
				and(
					eq(callParticipants.userId, userId),
					eq(callParticipants.status, "missed")
				)
			)
		callCount = Number(callResult?.count || 0)
	} catch {
		// Workspace may not exist yet
	}

	return { messages: messageCount, calls: callCount }
}
