import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

type ImageFormat = "jpeg" | "png" | "webp" | "avif"

const FORMAT_MIME: Record<ImageFormat, string> = {
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	avif: "image/avif",
}

const FORMAT_EXT: Record<ImageFormat, string> = {
	jpeg: "jpg",
	png: "png",
	webp: "webp",
	avif: "avif",
}

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
	}

	const formData = await req.formData()
	const file = formData.get("file") as File | null
	const format = formData.get("format") as ImageFormat | null
	const quality = parseInt(formData.get("quality") as string || "80", 10)
	const maxWidth = parseInt(formData.get("maxWidth") as string || "0", 10)
	const maxHeight = parseInt(formData.get("maxHeight") as string || "0", 10)

	if (!file) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 })
	}

	if (!file.type.startsWith("image/")) {
		return NextResponse.json({ error: "Only image files can be converted" }, { status: 400 })
	}

	const targetFormat = format || "webp"
	if (!FORMAT_MIME[targetFormat]) {
		return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
	}

	const clampedQuality = Math.max(1, Math.min(100, quality))

	try {
		const sharp = (await import("sharp")).default
		const buffer = Buffer.from(await file.arrayBuffer())

		let pipeline = sharp(buffer)

		// Resize if dimensions specified
		if (maxWidth > 0 || maxHeight > 0) {
			pipeline = pipeline.resize({
				width: maxWidth > 0 ? maxWidth : undefined,
				height: maxHeight > 0 ? maxHeight : undefined,
				fit: "inside",
				withoutEnlargement: true,
			})
		}

		// Convert to target format with quality
		switch (targetFormat) {
			case "jpeg":
				pipeline = pipeline.jpeg({ quality: clampedQuality, mozjpeg: true })
				break
			case "png":
				pipeline = pipeline.png({ quality: clampedQuality, compressionLevel: 9 })
				break
			case "webp":
				pipeline = pipeline.webp({ quality: clampedQuality })
				break
			case "avif":
				pipeline = pipeline.avif({ quality: clampedQuality })
				break
		}

		// Strip metadata
		pipeline = pipeline.rotate() // auto-rotate based on EXIF, then strip

		const outputBuffer = await pipeline.toBuffer()
		const metadata = await sharp(outputBuffer).metadata()

		const baseName = file.name.replace(/\.[^.]+$/, "")
		const outputFilename = `${baseName}.${FORMAT_EXT[targetFormat]}`

		return new NextResponse(new Uint8Array(outputBuffer), {
			headers: {
				"Content-Type": FORMAT_MIME[targetFormat],
				"Content-Disposition": `attachment; filename="${outputFilename}"`,
				"X-Original-Size": String(file.size),
				"X-Output-Size": String(outputBuffer.length),
				"X-Output-Width": String(metadata.width || 0),
				"X-Output-Height": String(metadata.height || 0),
				"X-Output-Filename": outputFilename,
			},
		})
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || "Conversion failed" },
			{ status: 500 }
		)
	}
}
