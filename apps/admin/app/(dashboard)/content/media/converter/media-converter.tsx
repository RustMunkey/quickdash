"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createMediaItem } from "../../actions"

type ImageFormat = "jpeg" | "png" | "webp" | "avif"

const FORMAT_OPTIONS: { value: ImageFormat; label: string; description: string }[] = [
	{ value: "webp", label: "WebP", description: "Best balance of quality and size" },
	{ value: "jpeg", label: "JPEG", description: "Universal compatibility" },
	{ value: "png", label: "PNG", description: "Lossless, larger files" },
	{ value: "avif", label: "AVIF", description: "Smallest files, newer format" },
]

const PRESETS: { label: string; quality: number }[] = [
	{ label: "High Quality", quality: 90 },
	{ label: "Balanced", quality: 75 },
	{ label: "Small File", quality: 50 },
	{ label: "Tiny", quality: 30 },
]

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function compressionRatio(original: number, output: number): string {
	if (original === 0) return "0%"
	const pct = ((1 - output / original) * 100).toFixed(0)
	return `${pct}% smaller`
}

type ConversionResult = {
	blob: Blob
	filename: string
	originalSize: number
	outputSize: number
	width: number
	height: number
	previewUrl: string
}

export function MediaConverter() {
	const [file, setFile] = useState<File | null>(null)
	const [preview, setPreview] = useState<string | null>(null)
	const [format, setFormat] = useState<ImageFormat>("webp")
	const [quality, setQuality] = useState(75)
	const [maxWidth, setMaxWidth] = useState(0)
	const [maxHeight, setMaxHeight] = useState(0)
	const [converting, setConverting] = useState(false)
	const [result, setResult] = useState<ConversionResult | null>(null)
	const [saving, setSaving] = useState(false)
	const [dragOver, setDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFile = useCallback((f: File) => {
		if (!f.type.startsWith("image/")) {
			toast.error("Only image files are supported")
			return
		}
		setFile(f)
		setResult(null)
		const url = URL.createObjectURL(f)
		setPreview(url)
	}, [])

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(false)
		const f = e.dataTransfer.files[0]
		if (f) handleFile(f)
	}, [handleFile])

	const handleConvert = async () => {
		if (!file) return
		setConverting(true)
		setResult(null)

		try {
			const formData = new FormData()
			formData.append("file", file)
			formData.append("format", format)
			formData.append("quality", String(quality))
			if (maxWidth > 0) formData.append("maxWidth", String(maxWidth))
			if (maxHeight > 0) formData.append("maxHeight", String(maxHeight))

			const res = await fetch("/api/convert-media", { method: "POST", body: formData })

			if (!res.ok) {
				const err = await res.json()
				throw new Error(err.error || "Conversion failed")
			}

			const blob = await res.blob()
			const filename = res.headers.get("X-Output-Filename") || `converted.${format}`
			const originalSize = parseInt(res.headers.get("X-Original-Size") || "0", 10)
			const outputSize = parseInt(res.headers.get("X-Output-Size") || "0", 10)
			const width = parseInt(res.headers.get("X-Output-Width") || "0", 10)
			const height = parseInt(res.headers.get("X-Output-Height") || "0", 10)

			const previewUrl = URL.createObjectURL(blob)

			setResult({ blob, filename, originalSize, outputSize, width, height, previewUrl })
			toast.success("Conversion complete")
		} catch (err: any) {
			toast.error(err.message || "Conversion failed")
		} finally {
			setConverting(false)
		}
	}

	const handleDownload = () => {
		if (!result) return
		const a = document.createElement("a")
		a.href = result.previewUrl
		a.download = result.filename
		a.click()
	}

	const handleSaveToLibrary = async () => {
		if (!result) return
		setSaving(true)

		try {
			const file = new File([result.blob], result.filename, { type: result.blob.type })
			const formData = new FormData()
			formData.append("file", file)

			const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
			if (!uploadRes.ok) {
				const err = await uploadRes.json()
				throw new Error(err.error || "Upload failed")
			}

			const { url } = await uploadRes.json()
			await createMediaItem({
				url,
				filename: result.filename,
				mimeType: result.blob.type,
				size: result.outputSize,
			})

			toast.success("Saved to media library")
		} catch (err: any) {
			toast.error(err.message || "Failed to save")
		} finally {
			setSaving(false)
		}
	}

	const handleReset = () => {
		if (preview) URL.revokeObjectURL(preview)
		if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl)
		setFile(null)
		setPreview(null)
		setResult(null)
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Left: Input */}
			<div className="space-y-4">
				{/* Drop zone */}
				{!file ? (
					<div
						onDrop={handleDrop}
						onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
						onDragLeave={() => setDragOver(false)}
						className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
							dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
						}`}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							onChange={(e) => {
								const f = e.target.files?.[0]
								if (f) handleFile(f)
								e.target.value = ""
							}}
						/>
						<div className="space-y-2">
							<p className="text-sm font-medium">Drop an image here or click to browse</p>
							<p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP, GIF, AVIF, SVG</p>
						</div>
					</div>
				) : (
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">Original</CardTitle>
								<Button size="sm" variant="ghost" onClick={handleReset}>Change file</Button>
							</div>
						</CardHeader>
						<CardContent>
							{preview && (
								<img
									src={preview}
									alt="Original"
									className="w-full max-h-64 object-contain rounded bg-muted mb-3"
								/>
							)}
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span>{file.name}</span>
								<Badge variant="secondary" className="text-[10px]">{formatBytes(file.size)}</Badge>
								<Badge variant="secondary" className="text-[10px]">{file.type.split("/")[1]?.toUpperCase()}</Badge>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Settings */}
				{file && (
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm">Settings</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Format */}
							<div className="space-y-2">
								<Label>Output Format</Label>
								<Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FORMAT_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												<span>{opt.label}</span>
												<span className="text-muted-foreground ml-2 text-xs">{opt.description}</span>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Quality */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Quality</Label>
									<span className="text-xs text-muted-foreground">{quality}%</span>
								</div>
								<Slider
									value={[quality]}
									onValueChange={([v]) => setQuality(v)}
									min={1}
									max={100}
									step={1}
								/>
								<div className="flex gap-2">
									{PRESETS.map((preset) => (
										<Button
											key={preset.label}
											size="sm"
											variant={quality === preset.quality ? "default" : "outline"}
											className="text-[10px] h-6 px-2"
											onClick={() => setQuality(preset.quality)}
										>
											{preset.label}
										</Button>
									))}
								</div>
							</div>

							{/* Resize */}
							<div className="space-y-2">
								<Label>Resize (optional)</Label>
								<div className="flex gap-2">
									<Input
										type="number"
										placeholder="Max width"
										value={maxWidth || ""}
										onChange={(e) => setMaxWidth(parseInt(e.target.value) || 0)}
										className="w-28"
									/>
									<span className="flex items-center text-muted-foreground text-xs">x</span>
									<Input
										type="number"
										placeholder="Max height"
										value={maxHeight || ""}
										onChange={(e) => setMaxHeight(parseInt(e.target.value) || 0)}
										className="w-28"
									/>
									<span className="flex items-center text-xs text-muted-foreground">px</span>
								</div>
								<p className="text-[10px] text-muted-foreground">Leave blank to keep original dimensions. Aspect ratio is preserved.</p>
							</div>

							<Button
								className="w-full"
								onClick={handleConvert}
								disabled={converting}
							>
								{converting ? "Converting..." : "Convert"}
							</Button>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Right: Output */}
			<div className="space-y-4">
				{result && (
					<>
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Result</CardTitle>
							</CardHeader>
							<CardContent>
								<img
									src={result.previewUrl}
									alt="Converted"
									className="w-full max-h-64 object-contain rounded bg-muted mb-3"
								/>
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span>{result.filename}</span>
										<Badge variant="secondary" className="text-[10px]">{formatBytes(result.outputSize)}</Badge>
										{result.width > 0 && (
											<Badge variant="secondary" className="text-[10px]">{result.width}x{result.height}</Badge>
										)}
									</div>
									{/* Compression summary */}
									<div className="rounded-lg border p-3 space-y-1">
										<div className="flex justify-between text-xs">
											<span className="text-muted-foreground">Original</span>
											<span>{formatBytes(result.originalSize)}</span>
										</div>
										<div className="flex justify-between text-xs">
											<span className="text-muted-foreground">Converted</span>
											<span>{formatBytes(result.outputSize)}</span>
										</div>
										<div className="flex justify-between text-xs font-medium">
											<span>Savings</span>
											<span className={result.outputSize < result.originalSize ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
												{result.outputSize < result.originalSize
													? compressionRatio(result.originalSize, result.outputSize)
													: result.outputSize === result.originalSize
														? "Same size"
														: `${((result.outputSize / result.originalSize - 1) * 100).toFixed(0)}% larger`
												}
											</span>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<div className="flex gap-2">
							<Button className="flex-1" onClick={handleDownload}>
								Download
							</Button>
							<Button
								className="flex-1"
								variant="outline"
								onClick={handleSaveToLibrary}
								disabled={saving}
							>
								{saving ? "Saving..." : "Save to Library"}
							</Button>
						</div>
					</>
				)}

				{!result && file && (
					<div className="flex items-center justify-center h-48 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
						Adjust settings and click Convert to see the result
					</div>
				)}

				{!file && (
					<div className="flex items-center justify-center h-48 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
						Select an image to get started
					</div>
				)}
			</div>
		</div>
	)
}
