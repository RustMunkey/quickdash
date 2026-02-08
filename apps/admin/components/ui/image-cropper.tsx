"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area, type Point } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

interface ImageCropperProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	imageSrc: string
	onCropComplete: (croppedImage: Blob) => void
	aspectRatio?: number
	cropShape?: "rect" | "round"
	title?: string
	description?: string
	recommendedSize?: string
	outputWidth?: number
	outputHeight?: number
}

async function getCroppedImg(
	imageSrc: string,
	pixelCrop: Area,
	outputWidth: number = 512,
	outputHeight: number = 512
): Promise<Blob> {
	const image = await createImage(imageSrc)
	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")

	if (!ctx) {
		throw new Error("No 2d context")
	}

	// Set canvas size to desired output
	canvas.width = outputWidth
	canvas.height = outputHeight

	// Draw the cropped image scaled to output size
	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		outputWidth,
		outputHeight
	)

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob)
				} else {
					reject(new Error("Canvas is empty"))
				}
			},
			"image/jpeg",
			0.9
		)
	})
}

function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener("load", () => resolve(image))
		image.addEventListener("error", (error) => reject(error))
		image.setAttribute("crossOrigin", "anonymous")
		image.src = url
	})
}

export function ImageCropper({
	open,
	onOpenChange,
	imageSrc,
	onCropComplete,
	aspectRatio = 1,
	cropShape = "round",
	title = "Crop Image",
	description = "Adjust the crop area to select the portion of the image you want to use.",
	recommendedSize = "512x512",
	outputWidth = 512,
	outputHeight = 512,
}: ImageCropperProps) {
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
	const [zoom, setZoom] = useState(1)
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const onCropChange = useCallback((location: Point) => {
		setCrop(location)
	}, [])

	const onZoomChange = useCallback((newZoom: number) => {
		setZoom(newZoom)
	}, [])

	const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
		setCroppedAreaPixels(croppedAreaPixels)
	}, [])

	const handleSave = async () => {
		if (!croppedAreaPixels) return

		setIsSaving(true)
		try {
			const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
			onCropComplete(croppedImage)
			onOpenChange(false)
			// Reset state
			setCrop({ x: 0, y: 0 })
			setZoom(1)
		} catch (error) {
			console.error("Error cropping image:", error)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		onOpenChange(false)
		setCrop({ x: 0, y: 0 })
		setZoom(1)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{description}
						{recommendedSize && (
							<span className="block mt-1 text-xs font-medium">
								Recommended size: {recommendedSize}
							</span>
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="relative h-64 w-full bg-muted rounded-lg overflow-hidden">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						aspect={aspectRatio}
						cropShape={cropShape}
						showGrid={false}
						onCropChange={onCropChange}
						onZoomChange={onZoomChange}
						onCropComplete={onCropAreaComplete}
					/>
				</div>

				<div className="space-y-2">
					<Label className="text-xs text-muted-foreground">Zoom</Label>
					<Slider
						value={[zoom]}
						min={1}
						max={3}
						step={0.1}
						onValueChange={(value) => setZoom(value[0])}
					/>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button type="button" onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Apply"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
