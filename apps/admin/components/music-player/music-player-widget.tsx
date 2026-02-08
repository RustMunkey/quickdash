"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	PlayIcon,
	PauseIcon,
	NextIcon,
	PreviousIcon,
	RepeatIcon,
	RepeatOne01Icon,
	ShuffleIcon,
	VolumeHighIcon,
	VolumeMuteIcon,
	VolumeLowIcon,
	ArrowUp01Icon,
	ArrowDown01Icon,
	Cancel01Icon,
	Radio02Icon,
	MusicNote03Icon,
	PlayListMinusIcon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { useMusicPlayer, type RepeatMode } from "./music-player-provider"
import { cn } from "@/lib/utils"

function formatTime(seconds: number): string {
	if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, "0")}`
}

function getVolumeIcon(volume: number, muted: boolean) {
	if (muted || volume === 0) return VolumeMuteIcon
	if (volume < 0.5) return VolumeLowIcon
	return VolumeHighIcon
}

function getRepeatIcon(mode: RepeatMode) {
	if (mode === "one") return RepeatOne01Icon
	return RepeatIcon
}

export function MusicPlayerWidget() {
	const {
		currentTrack,
		isPlaying,
		currentTime,
		duration,
		volume,
		isMuted,
		repeatMode,
		isShuffled,
		isWidgetOpen,
		isMinimized,
		tracks,
		currentTrackIndex,
		toggle,
		next,
		previous,
		seek,
		setVolume,
		toggleMute,
		setRepeatMode,
		toggleShuffle,
		playTrackByIndex,
		closeWidget,
		toggleMinimize,
	} = useMusicPlayer()

	const [isDraggingTime, setIsDraggingTime] = React.useState(false)
	const [dragTime, setDragTime] = React.useState(0)
	const dragControls = useDragControls()

	if (!isWidgetOpen) return null

	const displayTime = isDraggingTime ? dragTime : currentTime
	const isRadio = currentTrack?.type === "radio"
	const showDuration = !isRadio && duration > 0

	const cycleRepeatMode = () => {
		const modes: RepeatMode[] = ["none", "all", "one"]
		const currentIndex = modes.indexOf(repeatMode)
		setRepeatMode(modes[(currentIndex + 1) % modes.length])
	}

	if (isMinimized) {
		return (
			<AnimatePresence>
				<motion.div
					initial={{ scale: 0.8, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.8, opacity: 0, y: 20 }}
					drag
					dragMomentum={false}
					className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-background border shadow-lg px-3 py-2 cursor-grab active:cursor-grabbing"
				>
					<div className="flex items-center gap-2">
						<HugeiconsIcon
							icon={isRadio ? Radio02Icon : MusicNote03Icon}
							size={14}
							className="text-muted-foreground"
						/>
						<span className="text-sm font-medium max-w-[120px] truncate select-none">
							{currentTrack?.name || "No track"}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="size-7" onClick={previous}>
							<HugeiconsIcon icon={PreviousIcon} size={14} />
						</Button>
						<Button variant="ghost" size="icon" className="size-7" onClick={toggle}>
							<HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={14} />
						</Button>
						<Button variant="ghost" size="icon" className="size-7" onClick={next}>
							<HugeiconsIcon icon={NextIcon} size={14} />
						</Button>
					</div>
					<Button variant="ghost" size="icon" className="size-6" onClick={toggleMinimize}>
						<HugeiconsIcon icon={ArrowUp01Icon} size={12} />
					</Button>
				</motion.div>
			</AnimatePresence>
		)
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ scale: 0.8, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.8, opacity: 0, y: 20 }}
				drag
				dragMomentum={false}
				dragControls={dragControls}
				dragListener={false}
				className="fixed bottom-4 right-4 z-50 w-80 rounded-xl bg-background border shadow-xl overflow-hidden"
			>
				{/* Header - drag handle */}
				<div
					onPointerDown={(e) => dragControls.start(e)}
					className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 cursor-grab active:cursor-grabbing touch-none">
					<div className="flex items-center gap-2">
						<HugeiconsIcon
							icon={isRadio ? Radio02Icon : MusicNote03Icon}
							size={14}
							className="text-muted-foreground"
						/>
						<span className="text-xs font-medium text-muted-foreground select-none">
							{isRadio ? "Radio" : "Music"}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="size-6" onClick={toggleMinimize}>
							<HugeiconsIcon icon={ArrowDown01Icon} size={12} />
						</Button>
						<Button variant="ghost" size="icon" className="size-6" onClick={closeWidget}>
							<HugeiconsIcon icon={Cancel01Icon} size={12} />
						</Button>
					</div>
				</div>

				{/* Track Info */}
				<div className="px-4 py-3">
					<div className="flex items-center gap-3">
						<div className={cn(
							"size-12 rounded-lg flex items-center justify-center shrink-0",
							isPlaying ? "bg-primary/10" : "bg-muted"
						)}>
							<HugeiconsIcon
								icon={isRadio ? Radio02Icon : MusicNote03Icon}
								size={24}
								className={isPlaying ? "text-primary animate-pulse" : "text-muted-foreground"}
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium truncate">{currentTrack?.name || "No track selected"}</p>
							{currentTrack?.artist && (
								<p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
							)}
							{isRadio && (
								<p className="text-xs text-muted-foreground">Live radio stream</p>
							)}
						</div>
					</div>
				</div>

				{/* Progress Bar (only for non-radio tracks) */}
				{showDuration && (
					<div className="px-4 pb-2">
						<Slider
							value={[displayTime]}
							max={duration}
							step={1}
							onValueChange={([v]) => {
								setIsDraggingTime(true)
								setDragTime(v)
							}}
							onValueCommit={([v]) => {
								seek(v)
								setIsDraggingTime(false)
							}}
							className="w-full"
						/>
						<div className="flex justify-between mt-1">
							<span className="text-[10px] text-muted-foreground">{formatTime(displayTime)}</span>
							<span className="text-[10px] text-muted-foreground">{formatTime(duration)}</span>
						</div>
					</div>
				)}

				{/* Controls */}
				<div className="flex items-center justify-center gap-2 px-4 py-3 border-t">
					<Button
						variant="ghost"
						size="icon"
						className={cn("size-8", isShuffled && "text-primary")}
						onClick={toggleShuffle}
					>
						<HugeiconsIcon icon={ShuffleIcon} size={16} />
					</Button>
					<Button variant="ghost" size="icon" className="size-8" onClick={previous}>
						<HugeiconsIcon icon={PreviousIcon} size={16} />
					</Button>
					<Button
						variant="default"
						size="icon"
						className="size-10 rounded-full"
						onClick={toggle}
					>
						<HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} size={20} />
					</Button>
					<Button variant="ghost" size="icon" className="size-8" onClick={next}>
						<HugeiconsIcon icon={NextIcon} size={16} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className={cn("size-8", repeatMode !== "none" && "text-primary")}
						onClick={cycleRepeatMode}
					>
						<HugeiconsIcon icon={getRepeatIcon(repeatMode)} size={16} />
						{repeatMode === "one" && (
							<span className="absolute text-[8px] font-bold">1</span>
						)}
					</Button>
				</div>

				{/* Volume & Playlist */}
				<div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
					<div className="flex items-center gap-2 flex-1">
						<Button variant="ghost" size="icon" className="size-6" onClick={toggleMute}>
							<HugeiconsIcon icon={getVolumeIcon(volume, isMuted)} size={14} />
						</Button>
						<Slider
							value={[isMuted ? 0 : volume]}
							max={1}
							step={0.01}
							onValueChange={([v]) => setVolume(v)}
							className="w-20"
						/>
					</div>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="size-6">
								<HugeiconsIcon icon={PlayListMinusIcon} size={14} />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-64 p-0 max-h-72 overflow-y-auto">
							<div className="px-3 py-2 border-b sticky top-0 bg-background">
								<span className="text-xs font-medium text-muted-foreground">Playlist</span>
							</div>
							<div className="py-1">
								{/* Radio Stations Section */}
								{tracks.some(t => t.type === "radio") && (
									<>
										<div className="px-3 py-1.5">
											<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Radio Stations</span>
										</div>
										{tracks.map((track, index) => track.type === "radio" && (
											<button
												key={track.id}
												onClick={() => playTrackByIndex(index)}
												className={cn(
													"w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
													index === currentTrackIndex && "bg-accent"
												)}
											>
												<HugeiconsIcon
													icon={Radio02Icon}
													size={14}
													className="shrink-0 text-muted-foreground"
												/>
												<span className="truncate">{track.name}</span>
												{index === currentTrackIndex && isPlaying && (
													<span className="ml-auto size-1.5 rounded-full bg-primary animate-pulse" />
												)}
											</button>
										))}
									</>
								)}
								{/* My Library Section */}
								{tracks.some(t => t.type === "uploaded") && (
									<>
										<div className="px-3 py-1.5 mt-2">
											<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">My Library</span>
										</div>
										{tracks.map((track, index) => track.type === "uploaded" && (
											<button
												key={track.id}
												onClick={() => playTrackByIndex(index)}
												className={cn(
													"w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
													index === currentTrackIndex && "bg-accent"
												)}
											>
												<HugeiconsIcon
													icon={MusicNote03Icon}
													size={14}
													className="shrink-0 text-muted-foreground"
												/>
												<div className="flex-1 min-w-0">
													<span className="truncate block">{track.name}</span>
													{track.artist && (
														<span className="text-[10px] text-muted-foreground truncate block">{track.artist}</span>
													)}
												</div>
												{index === currentTrackIndex && isPlaying && (
													<span className="ml-auto size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
												)}
											</button>
										))}
									</>
								)}
								{/* Empty state for My Library */}
								{!tracks.some(t => t.type === "uploaded") && (
									<div className="px-3 py-3 text-center">
										<p className="text-[10px] text-muted-foreground">
											Upload tracks in Settings → Music Library
										</p>
									</div>
								)}
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</motion.div>
		</AnimatePresence>
	)
}
