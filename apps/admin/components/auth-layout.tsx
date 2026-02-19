"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

const AUTH_IMAGES: string[] = [
	"/images/FullSizeRender.jpg",
	"/images/FullSizeRender 2.jpg",
	"/images/IMG_6070.jpg",
	"/images/calgary.jpg",
	"/images/camp.jpg",
]

const FADE_INTERVAL = 8000 // 8 seconds per image
const FADE_DURATION = 1000 // 1 second fade transition

interface AuthLayoutProps {
	children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
	const [currentIndex, setCurrentIndex] = useState(0)
	const [nextIndex, setNextIndex] = useState(1)
	const [isTransitioning, setIsTransitioning] = useState(false)

	const hasImages = AUTH_IMAGES.length > 0

	useEffect(() => {
		if (AUTH_IMAGES.length <= 1) return

		const interval = setInterval(() => {
			setIsTransitioning(true)

			// After fade completes, update indices
			setTimeout(() => {
				setCurrentIndex(nextIndex)
				setNextIndex((nextIndex + 1) % AUTH_IMAGES.length)
				setIsTransitioning(false)
			}, FADE_DURATION)
		}, FADE_INTERVAL)

		return () => clearInterval(interval)
	}, [nextIndex])

	return (
		<div className="grid min-h-svh lg:grid-cols-2">
			{/* Left side - Hero image carousel */}
			<div className="relative hidden lg:flex flex-col overflow-hidden bg-neutral-900">
				{hasImages ? (
					<>
						{/* Current image */}
						<Image
							src={AUTH_IMAGES[currentIndex]}
							alt=""
							fill
							className={`object-cover transition-opacity duration-1000 ${
								isTransitioning ? "opacity-0" : "opacity-100"
							}`}
							priority
						/>
						{/* Next image (underneath, revealed during fade) */}
						{AUTH_IMAGES.length > 1 && (
							<Image
								src={AUTH_IMAGES[nextIndex]}
								alt=""
								fill
								className="object-cover"
							/>
						)}
						{/* Overlay */}
						<div className="absolute inset-0 bg-black/30" />
					</>
				) : (
					<div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
				)}
				{/* Logo overlay */}
				<div className="absolute top-8 left-8 z-10">
					<Image src="/quickdash.svg" alt="Quickdash" width={150} height={29} className="h-[29px] w-auto drop-shadow-lg" />
				</div>
				{/* Image indicators */}
				{AUTH_IMAGES.length > 1 && (
					<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2.5">
						{AUTH_IMAGES.map((_, index) => (
							<div
								key={index}
								className={`h-2 rounded-full transition-all duration-500 ${
									index === currentIndex
										? "w-8 bg-white"
										: "w-2 bg-white/40 hover:bg-white/60"
								}`}
							/>
						))}
					</div>
				)}
			</div>

			{/* Right side - Form */}
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-sm">
						{children}
					</div>
				</div>
			</div>
		</div>
	)
}
