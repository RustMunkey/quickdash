import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
	}

	const formData = await req.formData()
	const file = formData.get("file") as File | null

	if (!file) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 })
	}

	const maxSize = 50 * 1024 * 1024 // 50MB
	if (file.size > maxSize) {
		return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
	}

	if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
		return NextResponse.json({ error: "Only image and video files are allowed" }, { status: 400 })
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
		const blob = await put(`products/${Date.now()}-${sanitizedName}`, file, {
			access: "public",
		})
		return NextResponse.json({ url: blob.url, type: file.type })
	} catch (error: any) {
		return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
	}
}
