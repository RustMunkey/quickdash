import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, sql, like } from "@quickdash/db/drizzle"
import {
	siteContent,
	contentEntries,
	contentCollections,
	mediaItems,
	workspaces,
} from "@quickdash/db/schema"

const ADMIN_EMAILS = ["admin@quickdash.net", "ashermwilson@gmail.com", "wilson.asher00@gmail.com"]

function mimeToExt(mime: string): string {
	const map: Record<string, string> = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/jpg": "jpg",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/svg+xml": "svg",
		"image/avif": "avif",
	}
	return map[mime] || "bin"
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
	const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
	if (!match) return null
	return {
		mime: match[1],
		buffer: Buffer.from(match[2], "base64"),
	}
}

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session || !ADMIN_EMAILS.includes(session.user.email)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 })
	}

	const { searchParams } = new URL(req.url)
	const dryRun = searchParams.get("dry") === "true"

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 503 })
	}

	const { put } = await import("@vercel/blob")
	const results: { key: string; source: string; size: number; blobUrl?: string; status: string }[] = []

	// --- 1. Migrate site_content base64 values ---
	const base64Rows = await db
		.select({
			id: siteContent.id,
			key: siteContent.key,
			value: siteContent.value,
			workspaceId: siteContent.workspaceId,
		})
		.from(siteContent)
		.where(like(siteContent.value, "data:image%"))

	for (const row of base64Rows) {
		if (!row.value || !row.workspaceId) continue

		const parsed = parseDataUrl(row.value)
		if (!parsed) {
			results.push({ key: row.key, source: "site_content", size: 0, status: "parse_failed" })
			continue
		}

		const ext = mimeToExt(parsed.mime)
		const blobPath = `media/${row.workspaceId}/site-content/${row.key.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}.${ext}`

		if (dryRun) {
			results.push({
				key: row.key,
				source: "site_content",
				size: parsed.buffer.length,
				status: "would_migrate",
			})
			continue
		}

		try {
			const blob = await put(blobPath, parsed.buffer, {
				access: "public",
				contentType: parsed.mime,
			})

			if (!blob.url) {
				results.push({ key: row.key, source: "site_content", size: parsed.buffer.length, status: "upload_failed" })
				continue
			}

			// Optimistic lock: only update if value hasn't changed
			const [updated] = await db
				.update(siteContent)
				.set({ value: blob.url, updatedAt: new Date() })
				.where(
					sql`${siteContent.id} = ${row.id} AND ${siteContent.value} = ${row.value}`
				)
				.returning({ id: siteContent.id })

			if (!updated) {
				results.push({ key: row.key, source: "site_content", size: parsed.buffer.length, blobUrl: blob.url, status: "concurrent_update_skipped" })
				continue
			}

			// Track in media_items
			await db.insert(mediaItems).values({
				workspaceId: row.workspaceId,
				url: blob.url,
				filename: `${row.key}.${ext}`,
				mimeType: parsed.mime,
				size: parsed.buffer.length,
			})

			// Increment workspace storage
			await db
				.update(workspaces)
				.set({ storageUsedBytes: sql`${workspaces.storageUsedBytes} + ${parsed.buffer.length}` })
				.where(eq(workspaces.id, row.workspaceId))

			results.push({
				key: row.key,
				source: "site_content",
				size: parsed.buffer.length,
				blobUrl: blob.url,
				status: "migrated",
			})

			console.log(`[Migration] site_content ${row.key}: ${(parsed.buffer.length / 1024).toFixed(0)}KB → ${blob.url}`)
		} catch (err: any) {
			results.push({ key: row.key, source: "site_content", size: parsed.buffer.length, status: `error: ${err.message}` })
		}
	}

	// --- 2. Migrate content_entries JSONB base64 values ---
	const allEntries = await db
		.select({
			id: contentEntries.id,
			data: contentEntries.data,
			workspaceId: contentEntries.workspaceId,
			collectionId: contentEntries.collectionId,
		})
		.from(contentEntries)

	for (const entry of allEntries) {
		if (!entry.data || !entry.workspaceId) continue

		const data = entry.data as Record<string, unknown>
		let modified = false
		const newData = { ...data }

		for (const [fieldKey, fieldValue] of Object.entries(data)) {
			if (typeof fieldValue !== "string" || !fieldValue.startsWith("data:image")) continue

			const parsed = parseDataUrl(fieldValue)
			if (!parsed) continue

			const ext = mimeToExt(parsed.mime)
			const blobPath = `media/${entry.workspaceId}/collections/${entry.collectionId}/${fieldKey}-${Date.now()}.${ext}`

			if (dryRun) {
				results.push({
					key: `entry:${entry.id}:${fieldKey}`,
					source: "content_entries",
					size: parsed.buffer.length,
					status: "would_migrate",
				})
				continue
			}

			try {
				const blob = await put(blobPath, parsed.buffer, {
					access: "public",
					contentType: parsed.mime,
				})

				if (!blob.url) continue

				newData[fieldKey] = blob.url
				modified = true

				// Track in media_items
				await db.insert(mediaItems).values({
					workspaceId: entry.workspaceId,
					url: blob.url,
					filename: `${fieldKey}.${ext}`,
					mimeType: parsed.mime,
					size: parsed.buffer.length,
				})

				// Increment workspace storage
				await db
					.update(workspaces)
					.set({ storageUsedBytes: sql`${workspaces.storageUsedBytes} + ${parsed.buffer.length}` })
					.where(eq(workspaces.id, entry.workspaceId))

				results.push({
					key: `entry:${entry.id}:${fieldKey}`,
					source: "content_entries",
					size: parsed.buffer.length,
					blobUrl: blob.url,
					status: "migrated",
				})

				console.log(`[Migration] content_entry ${entry.id}:${fieldKey}: ${(parsed.buffer.length / 1024).toFixed(0)}KB → ${blob.url}`)
			} catch (err: any) {
				results.push({
					key: `entry:${entry.id}:${fieldKey}`,
					source: "content_entries",
					size: parsed.buffer.length,
					status: `error: ${err.message}`,
				})
			}
		}

		if (modified && !dryRun) {
			await db
				.update(contentEntries)
				.set({ data: newData, updatedAt: new Date() })
				.where(eq(contentEntries.id, entry.id))
		}
	}

	const migrated = results.filter(r => r.status === "migrated").length
	const failed = results.filter(r => r.status.startsWith("error")).length
	const skipped = results.filter(r => !["migrated", "would_migrate"].includes(r.status) && !r.status.startsWith("error")).length
	const wouldMigrate = results.filter(r => r.status === "would_migrate").length
	const totalBytes = results.reduce((sum, r) => sum + r.size, 0)

	return NextResponse.json({
		dryRun,
		summary: {
			migrated,
			failed,
			skipped,
			wouldMigrate,
			totalBytes,
			totalMB: (totalBytes / (1024 * 1024)).toFixed(1),
		},
		details: results,
	})
}
