"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ImageFormat = "jpeg" | "png" | "webp" | "avif"

const FORMATS: { value: ImageFormat; label: string }[] = [
	{ value: "webp", label: "WebP" },
	{ value: "jpeg", label: "JPEG" },
	{ value: "png", label: "PNG" },
	{ value: "avif", label: "AVIF" },
]

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileConverterWidget() {
	const [file, setFile] = React.useState<File | null>(null)
	const [format, setFormat] = React.useState<ImageFormat>("webp")
	const [quality, setQuality] = React.useState(75)
	const [converting, setConverting] = React.useState(false)
	const [result, setResult] = React.useState<{
		blob: Blob
		filename: string
		originalSize: number
		outputSize: number
	} | null>(null)

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0]
		if (f && f.type.startsWith("image/")) {
			setFile(f)
			setResult(null)
		}
		e.target.value = ""
	}

	const handleConvert = async () => {
		if (!file) return
		setConverting(true)
		try {
			const formData = new FormData()
			formData.append("file", file)
			formData.append("format", format)
			formData.append("quality", String(quality))

			const res = await fetch("/api/convert-media", { method: "POST", body: formData })
			if (!res.ok) throw new Error("Conversion failed")

			const blob = await res.blob()
			const filename = res.headers.get("X-Output-Filename") || `converted.${format}`
			const originalSize = parseInt(res.headers.get("X-Original-Size") || "0")
			const outputSize = parseInt(res.headers.get("X-Output-Size") || "0")

			setResult({ blob, filename, originalSize, outputSize })
			toast.success("Converted")
		} catch {
			toast.error("Conversion failed")
		} finally {
			setConverting(false)
		}
	}

	const handleDownload = () => {
		if (!result) return
		const url = URL.createObjectURL(result.blob)
		const a = document.createElement("a")
		a.href = url
		a.download = result.filename
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<div className="p-4 space-y-3">
			{/* File input */}
			<label className="block border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
				<input type="file" accept="image/*" className="hidden" onChange={handleFile} />
				{file ? (
					<div className="space-y-1">
						<p className="text-xs font-medium truncate">{file.name}</p>
						<p className="text-[10px] text-muted-foreground">
							{formatBytes(file.size)} &middot; {file.type.split("/")[1]?.toUpperCase()}
						</p>
					</div>
				) : (
					<p className="text-xs text-muted-foreground">Click to select an image</p>
				)}
			</label>

			{/* Format */}
			<div className="space-y-1.5">
				<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Output Format</p>
				<div className="flex gap-1">
					{FORMATS.map((f) => (
						<button
							key={f.value}
							type="button"
							onClick={() => setFormat(f.value)}
							className={cn(
								"flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors",
								format === f.value
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:text-foreground"
							)}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Quality */}
			<div className="space-y-1.5">
				<div className="flex justify-between">
					<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quality</p>
					<span className="text-[10px] text-muted-foreground">{quality}%</span>
				</div>
				<input
					type="range"
					min={1}
					max={100}
					value={quality}
					onChange={(e) => setQuality(Number(e.target.value))}
					className="w-full h-1.5 accent-primary"
				/>
			</div>

			{/* Convert */}
			<Button size="sm" className="w-full" onClick={handleConvert} disabled={!file || converting}>
				{converting ? "Converting..." : "Convert"}
			</Button>

			{/* Result */}
			{result && (
				<div className="space-y-2 border-t pt-3">
					<div className="rounded-lg bg-muted/50 p-2 space-y-1">
						<div className="flex justify-between text-[10px]">
							<span className="text-muted-foreground">Original</span>
							<span>{formatBytes(result.originalSize)}</span>
						</div>
						<div className="flex justify-between text-[10px]">
							<span className="text-muted-foreground">Output</span>
							<span>{formatBytes(result.outputSize)}</span>
						</div>
						{result.outputSize < result.originalSize && (
							<div className="flex justify-between text-[10px] font-medium">
								<span>Saved</span>
								<span className="text-green-600 dark:text-green-400">
									{((1 - result.outputSize / result.originalSize) * 100).toFixed(0)}% smaller
								</span>
							</div>
						)}
					</div>
					<Button size="sm" variant="outline" className="w-full text-xs" onClick={handleDownload}>
						Download
					</Button>
				</div>
			)}
		</div>
	)
}
