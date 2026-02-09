import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, sql } from "@quickdash/db/drizzle"
import {
	workspaces,
	mediaItems,
	FILE_SIZE_LIMITS,
} from "@quickdash/db/schema"
import { requireWorkspace } from "@/lib/workspace"

type FileCategory = "image" | "video" | "audio" | "document"

function getFileCategory(mimeType: string): FileCategory | null {
	if (mimeType.startsWith("image/")) return "image"
	if (mimeType.startsWith("video/")) return "video"
	if (mimeType.startsWith("audio/")) return "audio"
	// Documents: PDF, Office, text, archives, fonts, etc.
	if (
		mimeType === "application/pdf" ||
		mimeType.startsWith("application/vnd.openxmlformats") ||
		mimeType.startsWith("application/vnd.ms-") ||
		mimeType === "application/msword" ||
		mimeType === "application/zip" ||
		mimeType === "application/x-zip-compressed" ||
		mimeType === "application/gzip" ||
		mimeType === "application/x-tar" ||
		mimeType === "application/json" ||
		mimeType === "text/csv" ||
		mimeType === "text/plain" ||
		mimeType === "text/html" ||
		mimeType === "text/css" ||
		mimeType === "text/javascript" ||
		mimeType === "application/xml" ||
		mimeType === "font/woff" ||
		mimeType === "font/woff2" ||
		mimeType === "font/ttf" ||
		mimeType === "font/otf" ||
		mimeType === "application/x-font-woff" ||
		mimeType === "application/font-woff2" ||
		mimeType === "model/gltf-binary" ||
		mimeType === "model/gltf+json" ||
		mimeType === "application/octet-stream"
	) return "document"
	return null
}

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
	}

	let workspace
	try {
		workspace = await requireWorkspace()
	} catch {
		return NextResponse.json({ error: "No active workspace" }, { status: 400 })
	}

	const formData = await req.formData()
	const file = formData.get("file") as File | null

	if (!file) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 })
	}

	const category = getFileCategory(file.type)
	if (!category) {
		return NextResponse.json(
			{ error: `File type "${file.type}" is not supported` },
			{ status: 400 }
		)
	}

	// Per-file size limit by category
	const maxFileSize = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.document
	if (file.size > maxFileSize) {
		const limitMB = Math.round(maxFileSize / (1024 * 1024))
		return NextResponse.json(
			{ error: `${category.charAt(0).toUpperCase() + category.slice(1)} files must be under ${limitMB} MB` },
			{ status: 400 }
		)
	}

	// Check workspace storage limit (uses cached maxStorageBytes from tier sync)
	const [ws] = await db
		.select({
			storageUsedBytes: workspaces.storageUsedBytes,
			maxStorageBytes: workspaces.maxStorageBytes,
		})
		.from(workspaces)
		.where(eq(workspaces.id, workspace.id))
		.limit(1)

	if (!ws) {
		return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
	}

	const maxStorage = ws.maxStorageBytes ?? 0
	if (maxStorage !== -1 && (ws.storageUsedBytes ?? 0) + file.size > maxStorage) {
		return NextResponse.json(
			{ error: "Storage limit reached. Upgrade your plan for more storage." },
			{ status: 413 }
		)
	}

	try {
		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			return NextResponse.json(
				{ error: "File uploads require BLOB_READ_WRITE_TOKEN to be configured" },
				{ status: 503 }
			)
		}

		const { put } = await import("@vercel/blob")
		const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
		const blob = await put(
			`media/${workspace.id}/${Date.now()}-${sanitizedName}`,
			file,
			{ access: "public" }
		)

		// Insert into media_items for central tracking
		await db.insert(mediaItems).values({
			workspaceId: workspace.id,
			url: blob.url,
			filename: file.name,
			mimeType: file.type,
			size: file.size,
			uploadedBy: session.user.id,
		})

		// Increment workspace storage counter
		await db
			.update(workspaces)
			.set({
				storageUsedBytes: sql`${workspaces.storageUsedBytes} + ${file.size}`,
			})
			.where(eq(workspaces.id, workspace.id))

		return NextResponse.json({ url: blob.url, type: file.type })
	} catch (error: any) {
		return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
	}
}
