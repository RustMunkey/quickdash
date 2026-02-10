"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRESETS = [
	{ label: "High", quality: 90 },
	{ label: "Med", quality: 75 },
	{ label: "Low", quality: 50 },
	{ label: "Tiny", quality: 30 },
]

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileCompressorWidget() {
	const [file, setFile] = React.useState<File | null>(null)
	const [quality, setQuality] = React.useState(75)
	const [maxWidth, setMaxWidth] = React.useState("")
	const [compressing, setCompressing] = React.useState(false)
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

	const handleCompress = async () => {
		if (!file) return
		setCompressing(true)
		try {
			// Determine output format — use webp for best compression, unless it's already webp
			const ext = file.name.split(".").pop()?.toLowerCase()
			const format = ext === "png" ? "png" : "webp"

			const formData = new FormData()
			formData.append("file", file)
			formData.append("format", format)
			formData.append("quality", String(quality))
			if (maxWidth) formData.append("maxWidth", maxWidth)

			const res = await fetch("/api/convert-media", { method: "POST", body: formData })
			if (!res.ok) throw new Error("Compression failed")

			const blob = await res.blob()
			const filename = res.headers.get("X-Output-Filename") || `compressed.${format}`
			const originalSize = parseInt(res.headers.get("X-Original-Size") || "0")
			const outputSize = parseInt(res.headers.get("X-Output-Size") || "0")

			setResult({ blob, filename, originalSize, outputSize })
			toast.success("Compressed")
		} catch {
			toast.error("Compression failed")
		} finally {
			setCompressing(false)
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

	const savings = result
		? ((1 - result.outputSize / result.originalSize) * 100).toFixed(0)
		: null

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

			{/* Quality presets */}
			<div className="space-y-1.5">
				<div className="flex justify-between">
					<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quality</p>
					<span className="text-[10px] text-muted-foreground">{quality}%</span>
				</div>
				<div className="flex gap-1 mb-2">
					{PRESETS.map((p) => (
						<button
							key={p.label}
							type="button"
							onClick={() => setQuality(p.quality)}
							className={cn(
								"flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors",
								quality === p.quality
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:text-foreground"
							)}
						>
							{p.label}
						</button>
					))}
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

			{/* Max width */}
			<div className="space-y-1.5">
				<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Max Width (optional)</p>
				<input
					type="number"
					value={maxWidth}
					onChange={(e) => setMaxWidth(e.target.value)}
					placeholder="e.g. 1920"
					className="w-full h-8 px-2 text-xs bg-muted rounded-md border-none focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			{/* Compress */}
			<Button size="sm" className="w-full" onClick={handleCompress} disabled={!file || compressing}>
				{compressing ? "Compressing..." : "Compress"}
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
							<span className="text-muted-foreground">Compressed</span>
							<span>{formatBytes(result.outputSize)}</span>
						</div>
						<div className="flex justify-between text-[10px] font-medium">
							<span>Saved</span>
							<span className={Number(savings) > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
								{Number(savings) > 0 ? `${savings}% smaller` : "No size reduction"}
							</span>
						</div>
					</div>
					<Button size="sm" variant="outline" className="w-full text-xs" onClick={handleDownload}>
						Download
					</Button>
				</div>
			)}
		</div>
	)
}
