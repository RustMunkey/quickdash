import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

// This endpoint handles Vercel Blob client uploads
// It only validates auth and returns the upload token
// The DB record is created via server action after upload completes
export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as HandleUploadBody

	try {
		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (pathname, clientPayload) => {
				// Authenticate the user before allowing upload
				const session = await auth.api.getSession({ headers: await headers() })
				if (!session) {
					throw new Error("Unauthorized")
				}

				return {
					allowedContentTypes: [
						"audio/mpeg",
						"audio/mp3",
						"audio/wav",
						"audio/ogg",
						"audio/flac",
						"audio/aac",
						"audio/m4a",
						"audio/x-m4a",
					],
					maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
				}
			},
			// Don't use onUploadCompleted - it's async and unreliable for immediate DB updates
			// Instead, we create the DB record via server action after upload
			onUploadCompleted: async () => {
				// No-op - DB record created client-side via server action
			},
		})

		return NextResponse.json(jsonResponse)
	} catch (error) {
		console.error("Upload error:", error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Upload failed" },
			{ status: 400 }
		)
	}
}
