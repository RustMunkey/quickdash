"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@quickdash/db/client"
import { eq, desc, asc, max } from "@quickdash/db/drizzle"
import { userAudio } from "@quickdash/db/schema"
import { del } from "@vercel/blob"

export type UserAudioTrack = {
	id: string
	name: string
	artist: string | null
	url: string
	duration: number | null
	fileSize: number | null
	sortOrder: number
	createdAt: Date
}

async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) throw new Error("Unauthorized")
	return session.user
}

export async function getUserAudioTracks(): Promise<UserAudioTrack[]> {
	const user = await getCurrentUser()

	return db
		.select({
			id: userAudio.id,
			name: userAudio.name,
			artist: userAudio.artist,
			url: userAudio.url,
			duration: userAudio.duration,
			fileSize: userAudio.fileSize,
			sortOrder: userAudio.sortOrder,
			createdAt: userAudio.createdAt,
		})
		.from(userAudio)
		.where(eq(userAudio.userId, user.id))
		.orderBy(asc(userAudio.sortOrder), desc(userAudio.createdAt))
}

// Create a track record after client-side blob upload
export async function createAudioTrack(data: {
	name: string
	artist: string | null
	url: string
	fileSize: number | null
	mimeType: string
}): Promise<UserAudioTrack> {
	const user = await getCurrentUser()

	// Get the max sort order for this user
	const [maxOrder] = await db
		.select({ maxOrder: max(userAudio.sortOrder) })
		.from(userAudio)
		.where(eq(userAudio.userId, user.id))

	const nextOrder = (maxOrder?.maxOrder ?? -1) + 1

	const [track] = await db
		.insert(userAudio)
		.values({
			userId: user.id,
			name: data.name,
			artist: data.artist,
			url: data.url,
			fileSize: data.fileSize,
			mimeType: data.mimeType,
			sortOrder: nextOrder,
		})
		.returning()

	return {
		id: track.id,
		name: track.name,
		artist: track.artist,
		url: track.url,
		duration: track.duration,
		fileSize: track.fileSize,
		sortOrder: track.sortOrder,
		createdAt: track.createdAt,
	}
}

export async function updateAudioTrack(
	id: string,
	data: { name?: string; artist?: string | null; duration?: number }
): Promise<UserAudioTrack> {
	const user = await getCurrentUser()

	const [track] = await db
		.update(userAudio)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(userAudio.id, id))
		.returning()

	if (!track || track.userId !== user.id) {
		throw new Error("Track not found")
	}

	return {
		id: track.id,
		name: track.name,
		artist: track.artist,
		url: track.url,
		duration: track.duration,
		fileSize: track.fileSize,
		sortOrder: track.sortOrder,
		createdAt: track.createdAt,
	}
}

export async function reorderAudioTracks(trackIds: string[]): Promise<void> {
	const user = await getCurrentUser()

	// Update sort order for each track
	await Promise.all(
		trackIds.map((id, index) =>
			db
				.update(userAudio)
				.set({ sortOrder: index, updatedAt: new Date() })
				.where(eq(userAudio.id, id))
		)
	)
}

export async function deleteAudioTrack(id: string): Promise<void> {
	const user = await getCurrentUser()

	// Get the track first to get the URL
	const [track] = await db
		.select()
		.from(userAudio)
		.where(eq(userAudio.id, id))
		.limit(1)

	if (!track || track.userId !== user.id) {
		throw new Error("Track not found")
	}

	// Delete from blob storage
	try {
		await del(track.url)
	} catch {
		// Ignore blob deletion errors
	}

	// Delete from database
	await db.delete(userAudio).where(eq(userAudio.id, id))
}
