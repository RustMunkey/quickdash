"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { users, friendships } from "@quickdash/db/schema"
import { eq, ne, and, or, like, isNotNull } from "@quickdash/db/drizzle"

export async function followUser(userId: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		return { error: "Not authenticated" }
	}

	const currentUserId = session.user.id

	// Can't follow yourself
	if (userId === currentUserId) {
		return { error: "Cannot follow yourself" }
	}

	try {
		// Check if already following
		const existing = await db
			.select()
			.from(friendships)
			.where(
				and(
					eq(friendships.requesterId, currentUserId),
					eq(friendships.addresseeId, userId)
				)
			)
			.limit(1)

		if (existing.length > 0) {
			return { success: true } // Already following
		}

		// Create follow relationship (auto-accepted for follows)
		await db.insert(friendships).values({
			requesterId: currentUserId,
			addresseeId: userId,
			status: "accepted",
		})

		return { success: true }
	} catch (error) {
		console.error("Failed to follow user:", error)
		return { error: "Failed to follow user" }
	}
}

export async function unfollowUser(userId: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		return { error: "Not authenticated" }
	}

	const currentUserId = session.user.id

	try {
		await db
			.delete(friendships)
			.where(
				and(
					eq(friendships.requesterId, currentUserId),
					eq(friendships.addresseeId, userId)
				)
			)

		return { success: true }
	} catch (error) {
		console.error("Failed to unfollow user:", error)
		return { error: "Failed to unfollow user" }
	}
}

export async function searchUsers(query: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	if (!session?.user) {
		return []
	}

	const currentUserId = session.user.id
	const searchPattern = `%${query.toLowerCase()}%`

	try {
		const results = await db
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
					ne(users.id, currentUserId),
					isNotNull(users.username),
					or(
						like(users.name, searchPattern),
						like(users.username, searchPattern)
					)
				)
			)
			.limit(20)

		return results
	} catch (error) {
		console.error("Failed to search users:", error)
		return []
	}
}
