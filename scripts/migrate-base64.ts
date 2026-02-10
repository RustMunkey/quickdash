/**
 * One-time migration: base64 data URLs in site_content → Vercel Blob URLs
 *
 * Usage:
 *   DRY RUN:  DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." npx tsx scripts/migrate-base64.ts --dry
 *   REAL:     DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." npx tsx scripts/migrate-base64.ts
 */

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { pgTable, text, uuid, timestamp, index, integer, bigint } from "drizzle-orm/pg-core"
import { eq, like, sql as dsql } from "drizzle-orm"
import { put } from "@vercel/blob"

// Inline schema definitions (avoids import issues)
const siteContent = pgTable("site_content", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id"),
	key: text("key").notNull(),
	type: text("type").notNull().default("text"),
	value: text("value"),
	updatedBy: text("updated_by"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

const mediaItems = pgTable("media_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id"),
	url: text("url").notNull(),
	filename: text("filename").notNull(),
	mimeType: text("mime_type"),
	size: integer("size"),
	alt: text("alt"),
	folder: text("folder"),
	uploadedBy: text("uploaded_by"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

const workspaces = pgTable("workspaces", {
	id: uuid("id").primaryKey().defaultRandom(),
	storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0).notNull(),
})

// Setup
const databaseUrl = process.env.DATABASE_URL
const blobToken = process.env.BLOB_READ_WRITE_TOKEN
const dryRun = process.argv.includes("--dry")

if (!databaseUrl) { console.error("Missing DATABASE_URL"); process.exit(1) }
if (!blobToken) { console.error("Missing BLOB_READ_WRITE_TOKEN"); process.exit(1) }

const sql = neon(databaseUrl)
const db = drizzle(sql)

function mimeToExt(mime: string): string {
	const map: Record<string, string> = {
		"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
		"image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "image/avif": "avif",
	}
	return map[mime] || "bin"
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
	const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
	if (!match) return null
	return { mime: match[1], buffer: Buffer.from(match[2], "base64") }
}

async function main() {
	console.log(`\n=== Base64 → Blob Migration ${dryRun ? "(DRY RUN)" : "(LIVE)"} ===\n`)

	const rows = await db
		.select({ id: siteContent.id, key: siteContent.key, value: siteContent.value, workspaceId: siteContent.workspaceId })
		.from(siteContent)
		.where(like(siteContent.value, "data:image%"))

	console.log(`Found ${rows.length} base64 site_content rows\n`)

	let migrated = 0, failed = 0

	for (const row of rows) {
		if (!row.value || !row.workspaceId) continue

		const parsed = parseDataUrl(row.value)
		if (!parsed) {
			console.log(`  SKIP ${row.key}: couldn't parse data URL`)
			failed++
			continue
		}

		const sizeMB = (parsed.buffer.length / (1024 * 1024)).toFixed(2)
		const ext = mimeToExt(parsed.mime)
		const blobPath = `media/${row.workspaceId}/site-content/${row.key.replace(/[^a-zA-Z0-9._-]/g, "_")}-${Date.now()}.${ext}`

		if (dryRun) {
			console.log(`  WOULD MIGRATE ${row.key}: ${sizeMB} MB → ${blobPath}`)
			migrated++
			continue
		}

		try {
			// Upload to Vercel Blob
			const blob = await put(blobPath, parsed.buffer, {
				access: "public",
				contentType: parsed.mime,
				token: blobToken,
			})

			if (!blob.url) {
				console.log(`  FAIL ${row.key}: upload returned no URL`)
				failed++
				continue
			}

			// Update DB with optimistic lock
			const result = await db
				.update(siteContent)
				.set({ value: blob.url, updatedAt: new Date() })
				.where(eq(siteContent.id, row.id))

			// Track in media_items
			await db.insert(mediaItems).values({
				workspaceId: row.workspaceId,
				url: blob.url,
				filename: `${row.key}.${ext}`,
				mimeType: parsed.mime,
				size: parsed.buffer.length,
			})

			// Increment storage counter
			await db
				.update(workspaces)
				.set({ storageUsedBytes: dsql`${workspaces.storageUsedBytes} + ${parsed.buffer.length}` })
				.where(eq(workspaces.id, row.workspaceId))

			console.log(`  OK ${row.key}: ${sizeMB} MB → ${blob.url}`)
			migrated++
		} catch (err: any) {
			console.log(`  FAIL ${row.key}: ${err.message}`)
			failed++
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`  Migrated: ${migrated}`)
	console.log(`  Failed: ${failed}`)
	console.log(`  Total base64 rows: ${rows.length}\n`)
}

main().catch(console.error)
