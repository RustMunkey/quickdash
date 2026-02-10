/**
 * Migrate hero:images base64 data URLs to Vercel Blob URLs
 *
 * Usage:
 *   DRY RUN:  DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." npx tsx scripts/migrate-hero-images.ts --dry
 *   REAL:     DATABASE_URL="..." BLOB_READ_WRITE_TOKEN="..." npx tsx scripts/migrate-hero-images.ts
 */

import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { pgTable, text, uuid, timestamp, integer, bigint } from "drizzle-orm/pg-core"
import { eq, sql as dsql } from "drizzle-orm"
import { put } from "@vercel/blob"

const siteContent = pgTable("site_content", {
	id: uuid("id").primaryKey().defaultRandom(),
	workspaceId: uuid("workspace_id"),
	key: text("key").notNull(),
	type: text("type").notNull().default("text"),
	value: text("value"),
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
	createdAt: timestamp("created_at").defaultNow().notNull(),
})

const workspaces = pgTable("workspaces", {
	id: uuid("id").primaryKey().defaultRandom(),
	storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0).notNull(),
})

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
		"image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg",
	}
	return map[mime] || "png"
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
	const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
	if (!match) return null
	return { mime: match[1], buffer: Buffer.from(match[2], "base64") }
}

async function main() {
	console.log(`\n=== Hero Images Migration ${dryRun ? "(DRY RUN)" : "(LIVE)"} ===\n`)

	// Find all site_content rows with key containing :images that have JSON arrays with base64
	const rows = await db
		.select({ id: siteContent.id, key: siteContent.key, value: siteContent.value, workspaceId: siteContent.workspaceId })
		.from(siteContent)
		.where(dsql`${siteContent.value}::text LIKE '[%data:image%'`)

	console.log(`Found ${rows.length} rows with embedded base64 in JSON arrays\n`)

	let totalMigrated = 0
	let totalFailed = 0
	let totalBytes = 0

	for (const row of rows) {
		if (!row.value || !row.workspaceId) continue

		let items: any[]
		try {
			items = JSON.parse(row.value)
		} catch {
			console.log(`  SKIP ${row.key}: not valid JSON`)
			continue
		}

		if (!Array.isArray(items)) {
			console.log(`  SKIP ${row.key}: not an array`)
			continue
		}

		console.log(`Processing ${row.key} (${items.length} items)...`)
		let changed = false

		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			const imageField = item.image || item.url || item.src
			if (!imageField || !imageField.startsWith("data:image")) continue

			const parsed = parseDataUrl(imageField)
			if (!parsed) {
				console.log(`  [${i}] SKIP: couldn't parse data URL`)
				totalFailed++
				continue
			}

			const sizeMB = (parsed.buffer.length / (1024 * 1024)).toFixed(2)
			const ext = mimeToExt(parsed.mime)
			const safeName = (item.name || `item_${i}`).replace(/[^a-zA-Z0-9._-]/g, "_")
			const blobPath = `media/${row.workspaceId}/site-content/hero_${safeName}_${Date.now()}.${ext}`

			if (dryRun) {
				console.log(`  [${i}] WOULD MIGRATE ${item.name || i}: ${sizeMB} MB → ${blobPath}`)
				totalMigrated++
				continue
			}

			try {
				const blob = await put(blobPath, parsed.buffer, {
					access: "public",
					contentType: parsed.mime,
					token: blobToken,
				})

				if (!blob.url) {
					console.log(`  [${i}] FAIL: upload returned no URL`)
					totalFailed++
					continue
				}

				// Replace the base64 with blob URL in the JSON
				if (item.image) item.image = blob.url
				else if (item.url) item.url = blob.url
				else if (item.src) item.src = blob.url
				changed = true

				// Track in media_items
				await db.insert(mediaItems).values({
					workspaceId: row.workspaceId,
					url: blob.url,
					filename: `hero_${safeName}.${ext}`,
					mimeType: parsed.mime,
					size: parsed.buffer.length,
					folder: "site-content",
				})

				totalBytes += parsed.buffer.length
				console.log(`  [${i}] OK ${item.name || i}: ${sizeMB} MB → ${blob.url}`)
				totalMigrated++
			} catch (err: any) {
				console.log(`  [${i}] FAIL: ${err.message}`)
				totalFailed++
			}
		}

		if (changed && !dryRun) {
			const newValue = JSON.stringify(items)
			console.log(`  Writing updated JSON (${newValue.length} chars, was ${row.value.length} chars)`)

			await db
				.update(siteContent)
				.set({ value: newValue, updatedAt: new Date() })
				.where(eq(siteContent.id, row.id))

			// Update storage counter
			if (totalBytes > 0) {
				await db
					.update(workspaces)
					.set({ storageUsedBytes: dsql`COALESCE(${workspaces.storageUsedBytes}, 0) + ${totalBytes}` })
					.where(eq(workspaces.id, row.workspaceId))
			}
		}
	}

	console.log(`\n=== Summary ===`)
	console.log(`  Images migrated: ${totalMigrated}`)
	console.log(`  Failed: ${totalFailed}`)
	console.log(`  Total bytes uploaded: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB\n`)
}

main().catch(console.error)
