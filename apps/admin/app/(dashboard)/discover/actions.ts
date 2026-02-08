"use server"

import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { users, friendships, directMessages, dmConversations, notifications } from "@quickdash/db/schema"
import { eq, ne, and, or, like, isNotNull, desc, asc, sql, inArray } from "@quickdash/db/drizzle"
import { auth } from "@/lib/auth"
import { pusherServer } from "@/lib/pusher-server"


async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) throw new Error("Not authenticated")
	return session.user
}

// ============ USER DISCOVERY ============

export async function getAllUsers() {
	const user = await getCurrentUser()

	return db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
			bio: users.bio,
			location: users.location,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(
			and(
				ne(users.id, user.id),
				isNotNull(users.username)
			)
		)
		.orderBy(desc(users.createdAt))
		.limit(100)
}

export async function searchAllUsers(query: string) {
	const user = await getCurrentUser()
	const searchPattern = `%${query.toLowerCase()}%`

	return db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
			bio: users.bio,
		})
		.from(users)
		.where(
			and(
				ne(users.id, user.id),
				or(
					sql`LOWER(${users.name}) LIKE ${searchPattern}`,
					sql`LOWER(${users.username}) LIKE ${searchPattern}`
				)
			)
		)
		.limit(20)
}

// ============ FRIENDS ============

export async function sendFriendRequest(addresseeId: string) {
	const user = await getCurrentUser()

	if (user.id === addresseeId) {
		throw new Error("Cannot send friend request to yourself")
	}

	// Check if already friends or pending
	const existing = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, addresseeId)),
				and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, user.id))
			)
		)
		.limit(1)

	if (existing.length > 0) {
		const status = existing[0].status
		if (status === "accepted") throw new Error("Already friends")
		if (status === "pending") throw new Error("Request already pending")
		if (status === "blocked") throw new Error("Cannot send request")
		// If declined, remove old record so they can re-add
		if (status === "declined") {
			await db.delete(friendships).where(eq(friendships.id, existing[0].id))
		}
	}

	await db.insert(friendships).values({
		requesterId: user.id,
		addresseeId,
		status: "pending",
	})

	// Get requester info for notification + Pusher
	const [requester] = await db
		.select({ name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)

	// Create a persistent DB notification for the addressee
	await db.insert(notifications).values({
		userId: addresseeId,
		type: "friend_request",
		title: "New friend request",
		body: `${requester?.name || "Someone"} sent you a friend request.`,
		link: "/discover",
		metadata: { fromUserId: user.id, fromUserName: requester?.name, fromUserImage: requester?.image },
	})

	// Notify the addressee via Pusher for real-time
	if (pusherServer) {
		await pusherServer.trigger(`private-user-${addresseeId}`, "friend-request", {
			from: { id: user.id, name: requester?.name, image: requester?.image },
		}).catch(() => {})
	}

	return { success: true }
}

export async function acceptFriendRequest(requesterId: string) {
	const user = await getCurrentUser()

	await db
		.update(friendships)
		.set({ status: "accepted", updatedAt: new Date() })
		.where(
			and(
				eq(friendships.requesterId, requesterId),
				eq(friendships.addresseeId, user.id),
				eq(friendships.status, "pending")
			)
		)

	// Get accepter info for notification
	const [accepter] = await db
		.select({ name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)

	// Create a DB notification for the requester
	await db.insert(notifications).values({
		userId: requesterId,
		type: "friend_accepted",
		title: "Friend request accepted",
		body: `${accepter?.name || "Someone"} accepted your friend request.`,
		link: "/discover",
		metadata: { fromUserId: user.id, fromUserName: accepter?.name, fromUserImage: accepter?.image },
	})

	// Notify the requester via Pusher for real-time
	if (pusherServer) {
		await pusherServer.trigger(`private-user-${requesterId}`, "friend-accepted", {
			userId: user.id,
		}).catch(() => {})
	}

	return { success: true }
}

export async function declineFriendRequest(requesterId: string) {
	const user = await getCurrentUser()

	await db
		.delete(friendships)
		.where(
			and(
				eq(friendships.requesterId, requesterId),
				eq(friendships.addresseeId, user.id),
				eq(friendships.status, "pending")
			)
		)

	return { success: true }
}

export async function removeFriend(friendId: string) {
	const user = await getCurrentUser()

	await db
		.delete(friendships)
		.where(
			and(
				or(
					and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, friendId)),
					and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, user.id))
				),
				eq(friendships.status, "accepted")
			)
		)

	return { success: true }
}

export async function getFriends() {
	const user = await getCurrentUser()

	// Get friendships where current user is either requester or addressee
	const friendshipsList = await db
		.select({
			id: friendships.id,
			requesterId: friendships.requesterId,
			addresseeId: friendships.addresseeId,
			status: friendships.status,
			createdAt: friendships.createdAt,
		})
		.from(friendships)
		.where(
			and(
				or(
					eq(friendships.requesterId, user.id),
					eq(friendships.addresseeId, user.id)
				),
				eq(friendships.status, "accepted")
			)
		)

	// Get friend user IDs
	const friendIds = friendshipsList.map(f =>
		f.requesterId === user.id ? f.addresseeId : f.requesterId
	)

	if (friendIds.length === 0) return []

	// Get friend details
	const friends = await db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
			bio: users.bio,
		})
		.from(users)
		.where(inArray(users.id, friendIds))

	return friends
}

export async function getPendingFriendRequests() {
	const user = await getCurrentUser()

	// Incoming requests
	const incoming = await db
		.select({
			id: friendships.id,
			requesterId: friendships.requesterId,
			createdAt: friendships.createdAt,
			requesterName: users.name,
			requesterUsername: users.username,
			requesterImage: users.image,
		})
		.from(friendships)
		.innerJoin(users, eq(users.id, friendships.requesterId))
		.where(
			and(
				eq(friendships.addresseeId, user.id),
				eq(friendships.status, "pending")
			)
		)
		.orderBy(desc(friendships.createdAt))

	// Outgoing requests
	const outgoing = await db
		.select({
			id: friendships.id,
			addresseeId: friendships.addresseeId,
			createdAt: friendships.createdAt,
			addresseeName: users.name,
			addresseeUsername: users.username,
			addresseeImage: users.image,
		})
		.from(friendships)
		.innerJoin(users, eq(users.id, friendships.addresseeId))
		.where(
			and(
				eq(friendships.requesterId, user.id),
				eq(friendships.status, "pending")
			)
		)
		.orderBy(desc(friendships.createdAt))

	return { incoming, outgoing }
}

export async function getFriendshipStatus(otherUserId: string) {
	const user = await getCurrentUser()

	const [friendship] = await db
		.select()
		.from(friendships)
		.where(
			or(
				and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, otherUserId)),
				and(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, user.id))
			)
		)
		.limit(1)

	if (!friendship) return { status: "none" as const }

	return {
		status: friendship.status,
		isRequester: friendship.requesterId === user.id,
	}
}

export async function getMutualFriends(otherUserId: string) {
	const user = await getCurrentUser()

	// Get current user's friend IDs
	const myFriendships = await db
		.select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
		.from(friendships)
		.where(
			and(
				or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id)),
				eq(friendships.status, "accepted")
			)
		)

	const myFriendIds = new Set(
		myFriendships.map(f => f.requesterId === user.id ? f.addresseeId : f.requesterId)
	)

	// Get other user's friend IDs
	const theirFriendships = await db
		.select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
		.from(friendships)
		.where(
			and(
				or(eq(friendships.requesterId, otherUserId), eq(friendships.addresseeId, otherUserId)),
				eq(friendships.status, "accepted")
			)
		)

	const theirFriendIds = new Set(
		theirFriendships.map(f => f.requesterId === otherUserId ? f.addresseeId : f.requesterId)
	)

	// Find intersection
	const mutualIds = [...myFriendIds].filter(id => theirFriendIds.has(id))
	if (mutualIds.length === 0) return []

	return db
		.select({ id: users.id, name: users.name, image: users.image })
		.from(users)
		.where(inArray(users.id, mutualIds))
		.limit(10)
}

// ============ DIRECT MESSAGES ============

export async function getOrCreateConversation(otherUserId: string) {
	const user = await getCurrentUser()

	// Always store with lower ID first for consistency
	const [p1, p2] = [user.id, otherUserId].sort()

	// Check for existing conversation
	const [existing] = await db
		.select()
		.from(dmConversations)
		.where(
			and(
				eq(dmConversations.participant1Id, p1),
				eq(dmConversations.participant2Id, p2)
			)
		)
		.limit(1)

	if (existing) return existing

	// Create new conversation
	const [conversation] = await db
		.insert(dmConversations)
		.values({
			participant1Id: p1,
			participant2Id: p2,
		})
		.returning()

	return conversation
}

export async function getConversations() {
	const user = await getCurrentUser()

	const conversations = await db
		.select()
		.from(dmConversations)
		.where(
			or(
				eq(dmConversations.participant1Id, user.id),
				eq(dmConversations.participant2Id, user.id)
			)
		)
		.orderBy(desc(dmConversations.lastMessageAt))

	// Get other participant details for each conversation
	const result = await Promise.all(
		conversations.map(async (conv) => {
			const otherUserId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id

			const [otherUser] = await db
				.select({
					id: users.id,
					name: users.name,
					username: users.username,
					image: users.image,
				})
				.from(users)
				.where(eq(users.id, otherUserId))
				.limit(1)

			// Count unread messages
			const [unreadCount] = await db
				.select({ count: sql<number>`count(*)` })
				.from(directMessages)
				.where(
					and(
						eq(directMessages.conversationId, conv.id),
						ne(directMessages.senderId, user.id),
						sql`${directMessages.readAt} IS NULL`
					)
				)

			return {
				...conv,
				otherUser,
				unreadCount: Number(unreadCount?.count || 0),
			}
		})
	)

	return result
}

export async function getDirectMessages(conversationId: string, limit = 200) {
	const user = await getCurrentUser()

	// Verify user is part of conversation
	const [conv] = await db
		.select()
		.from(dmConversations)
		.where(
			and(
				eq(dmConversations.id, conversationId),
				or(
					eq(dmConversations.participant1Id, user.id),
					eq(dmConversations.participant2Id, user.id)
				)
			)
		)
		.limit(1)

	if (!conv) throw new Error("Conversation not found")

	// Fetch latest messages (desc) then reverse so they display oldest-first
	const messages = await db
		.select({
			id: directMessages.id,
			senderId: directMessages.senderId,
			body: directMessages.body,
			attachments: directMessages.attachments,
			isEdited: directMessages.isEdited,
			readAt: directMessages.readAt,
			createdAt: directMessages.createdAt,
			senderName: users.name,
			senderImage: users.image,
		})
		.from(directMessages)
		.innerJoin(users, eq(users.id, directMessages.senderId))
		.where(eq(directMessages.conversationId, conversationId))
		.orderBy(desc(directMessages.createdAt))
		.limit(limit)

	return messages.reverse()
}

export async function sendDirectMessage(conversationId: string, body: string, attachments?: any[]) {
	const user = await getCurrentUser()

	// Verify user is part of conversation
	const [conv] = await db
		.select()
		.from(dmConversations)
		.where(
			and(
				eq(dmConversations.id, conversationId),
				or(
					eq(dmConversations.participant1Id, user.id),
					eq(dmConversations.participant2Id, user.id)
				)
			)
		)
		.limit(1)

	if (!conv) throw new Error("Conversation not found")

	const [message] = await db
		.insert(directMessages)
		.values({
			conversationId,
			senderId: user.id,
			body,
			attachments: attachments || [],
		})
		.returning()

	// Update conversation with last message
	await db
		.update(dmConversations)
		.set({
			lastMessageAt: new Date(),
			lastMessagePreview: body.slice(0, 100),
		})
		.where(eq(dmConversations.id, conversationId))

	// Get sender info for the push notification
	const [sender] = await db
		.select({ name: users.name, image: users.image })
		.from(users)
		.where(eq(users.id, user.id))
		.limit(1)

	// Notify other participant
	const otherUserId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id

	if (pusherServer) {
		await pusherServer.trigger(`private-user-${otherUserId}`, "dm-received", {
			conversationId,
			message: {
				id: message.id,
				senderId: user.id,
				senderName: sender?.name,
				senderImage: sender?.image,
				body,
				attachments: attachments || [],
				createdAt: message.createdAt.toISOString(),
			},
		})
	}

	return {
		id: message.id,
		senderId: user.id,
		senderName: sender?.name,
		senderImage: sender?.image,
		body,
		attachments: attachments || [],
		createdAt: message.createdAt,
	}
}

export async function markDMsAsRead(conversationId: string, messageIds?: string[]) {
	const user = await getCurrentUser()

	if (messageIds && messageIds.length > 0) {
		// Mark specific messages as read
		await db
			.update(directMessages)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(directMessages.conversationId, conversationId),
					ne(directMessages.senderId, user.id),
					sql`${directMessages.readAt} IS NULL`,
					inArray(directMessages.id, messageIds)
				)
			)

		// Notify the sender that their messages were read
		const [conv] = await db
			.select()
			.from(dmConversations)
			.where(eq(dmConversations.id, conversationId))
			.limit(1)
		if (conv && pusherServer) {
			const senderId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id
			pusherServer.trigger(`private-user-${senderId}`, "dm-read", {
				conversationId,
				messageIds,
				readBy: user.id,
			}).catch(() => {})
		}
	} else {
		// Legacy bulk mark (kept for backward compat)
		await db
			.update(directMessages)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(directMessages.conversationId, conversationId),
					ne(directMessages.senderId, user.id),
					sql`${directMessages.readAt} IS NULL`
				)
			)
	}
}

// ============ USER PROFILE ============

export async function getUserProfile(userId: string) {
	const [profile] = await db
		.select({
			id: users.id,
			name: users.name,
			username: users.username,
			image: users.image,
			bannerImage: users.bannerImage,
			bannerGradient: users.bannerGradient,
			bio: users.bio,
			location: users.location,
			website: users.website,
			occupation: users.occupation,
			socials: users.socials,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)

	return profile
}
