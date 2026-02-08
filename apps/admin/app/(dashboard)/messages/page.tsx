import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getTeamMessages, getTeamMembers, getInboxEmails } from "./actions"
import { getFriends, getConversations } from "@/app/(dashboard)/discover/actions"
import { MessagesClient } from "./messages-client"

// Disable caching for this page - always fetch fresh messages
export const dynamic = "force-dynamic"

interface MessagesPageProps {
	searchParams: Promise<{ email?: string }>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) redirect("/login")

	const params = await searchParams

	const [messages, teamMembers, inboxEmails, friends, dmConversations] = await Promise.all([
		getTeamMessages(session.user.id),
		getTeamMembers(),
		getInboxEmails(),
		getFriends(),
		getConversations(),
	])

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<MessagesClient
				messages={messages.map((m) => ({
					...m,
					senderName: m.senderName || "Unknown",
					contentType: m.contentType as "text" | "markdown" | "call" | undefined,
					callData: m.callData ?? undefined,
					attachments: m.attachments || undefined,
					createdAt: m.createdAt.toISOString(),
					readAt: m.readAt?.toISOString() || null,
				}))}
				userId={session.user.id}
				userName={session.user.name || "Unknown"}
				userImage={session.user.image ?? null}
				teamMembers={teamMembers.map((m) => ({
					...m,
					name: m.name || "Unknown",
				}))}
				inboxEmails={inboxEmails}
				selectedEmailId={params.email}
				friends={friends}
				dmConversations={dmConversations}
			/>
		</div>
	)
}
