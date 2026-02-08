"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ImageUploadProps {
	value: string
	onChange: (url: string) => void
	placeholder?: string
	accept?: string
	className?: string
}

export function ImageUpload({
	value,
	onChange,
	placeholder = "Upload image or paste URL",
	accept = "image/*",
	className,
}: ImageUploadProps) {
	const [uploading, setUploading] = useState(false)
	const [showUrlInput, setShowUrlInput] = useState(false)
	const [urlInput, setUrlInput] = useState("")
	const [dragOver, setDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const uploadFile = async (file: File) => {
		setUploading(true)
		const formData = new FormData()
		formData.append("file", file)

		try {
			const res = await fetch("/api/upload", { method: "POST", body: formData })
			const data = await res.json()
			if (!res.ok) {
				toast.error(data.error || "Upload failed")
				return
			}
			onChange(data.url)
			toast.success("Image uploaded")
		} catch {
			toast.error("Upload failed")
		} finally {
			setUploading(false)
		}
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			uploadFile(file)
		}
		e.target.value = ""
	}

	const handleUrlSubmit = () => {
		const url = urlInput.trim()
		if (url) {
			onChange(url)
			setUrlInput("")
			setShowUrlInput(false)
		}
	}

	const handleRemove = () => {
		onChange("")
	}

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(false)
		const file = e.dataTransfer.files?.[0]
		if (file && file.type.startsWith("image/")) {
			uploadFile(file)
		}
	}, [])

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(true)
	}, [])

	const handleDragLeave = useCallback(() => {
		setDragOver(false)
	}, [])

	return (
		<div className={className}>
			{value ? (
				<div
					className="relative group"
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
				>
					<div className={`w-full h-24 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden transition-colors ${
						dragOver ? "border-primary border-2 border-dashed" : ""
					}`}>
						{dragOver ? (
							<p className="text-sm text-primary font-medium">Drop to replace</p>
						) : (
							<img
								src={value}
								alt=""
								className="max-h-full max-w-full object-contain"
							/>
						)}
					</div>
					<div className={`absolute inset-0 bg-black/50 transition-opacity rounded-lg flex items-center justify-center gap-2 ${
						dragOver ? "opacity-0" : "opacity-0 group-hover:opacity-100"
					}`}>
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={() => fileInputRef.current?.click()}
						>
							Replace
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={handleRemove}
						>
							Remove
						</Button>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept={accept}
						className="hidden"
						onChange={handleFileChange}
					/>
				</div>
			) : (
				<div className="space-y-2">
					<div
						className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
							dragOver ? "border-primary bg-primary/5" : "hover:border-muted-foreground/50"
						}`}
						onClick={() => fileInputRef.current?.click()}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept={accept}
							className="hidden"
							onChange={handleFileChange}
						/>
						{uploading ? (
							<p className="text-sm text-muted-foreground">Uploading...</p>
						) : dragOver ? (
							<p className="text-sm text-primary font-medium">Drop image here</p>
						) : (
							<>
								<p className="text-sm text-muted-foreground">{placeholder}</p>
								<p className="text-xs text-muted-foreground/70 mt-1">Drag & drop or click to browse</p>
							</>
						)}
					</div>
					{showUrlInput ? (
						<div className="flex gap-2">
							<Input
								value={urlInput}
								onChange={(e) => setUrlInput(e.target.value)}
								placeholder="https://..."
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault()
										handleUrlSubmit()
									}
								}}
							/>
							<Button type="button" size="sm" variant="outline" onClick={handleUrlSubmit}>
								Add
							</Button>
							<Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
								Cancel
							</Button>
						</div>
					) : (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="text-xs"
							onClick={() => setShowUrlInput(true)}
						>
							Or paste URL
						</Button>
					)}
				</div>
			)}
		</div>
	)
}
