"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	Calculator01Icon,
	MusicNote03Icon,
	Note01Icon,
	ChartHistogramIcon,
	ArrowDataTransferHorizontalIcon,
	Cancel01Icon,
	ArrowDown01Icon,
	ArrowUp01Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useToolbar, type ToolbarWidget } from "./toolbar-provider"
import { useRightSidebar } from "@/components/ui/right-sidebar"
import { useMusicPlayer } from "@/components/music-player"
import { cn } from "@/lib/utils"

// Import widgets
import { NotesWidget } from "./widgets/notes-widget"
import { StatsWidget } from "./widgets/stats-widget"
import { ConverterWidget } from "./widgets/converter-widget"
import { BasicCalculator } from "./widgets/calculator-inline"

type NonNullWidget = Exclude<ToolbarWidget, null>

const WIDGET_INFO: Record<NonNullWidget, {
	icon: typeof Calculator01Icon
	label: string
}> = {
	calculator: { icon: Calculator01Icon, label: "Calculator" },
	music: { icon: MusicNote03Icon, label: "Music" },
	notes: { icon: Note01Icon, label: "Notes" },
	stats: { icon: ChartHistogramIcon, label: "Quick Stats" },
	converter: { icon: ArrowDataTransferHorizontalIcon, label: "Converter" },
}

// Order for consistent stacking (rightmost = index 0)
const WIDGET_ORDER: NonNullWidget[] = ["calculator", "music", "notes", "stats", "converter"]

function MusicContent() {
	const {
		currentTrack,
		isPlaying,
		tracks,
		currentTrackIndex,
		toggle,
		next,
		previous,
		playTrackByIndex,
	} = useMusicPlayer()

	return (
		<div className="p-4 space-y-4">
			{/* Now Playing */}
			<div className="text-center">
				<div className={cn(
					"size-16 mx-auto rounded-lg flex items-center justify-center mb-3",
					isPlaying ? "bg-primary/10" : "bg-muted"
				)}>
					<HugeiconsIcon
						icon={MusicNote03Icon}
						size={32}
						className={isPlaying ? "text-primary animate-pulse" : "text-muted-foreground"}
					/>
				</div>
				<p className="font-medium truncate">{currentTrack?.name || "No track"}</p>
				{currentTrack?.artist && (
					<p className="text-sm text-muted-foreground">{currentTrack.artist}</p>
				)}
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-2">
				<Button variant="ghost" size="icon" className="size-10" onClick={previous}>
					◀◀
				</Button>
				<Button variant="default" size="icon" className="size-12 rounded-full" onClick={toggle}>
					{isPlaying ? "⏸" : "▶"}
				</Button>
				<Button variant="ghost" size="icon" className="size-10" onClick={next}>
					▶▶
				</Button>
			</div>

			{/* Playlist */}
			{tracks.length > 0 && (
				<div className="border-t pt-3 max-h-40 overflow-y-auto">
					<div className="text-xs font-medium text-muted-foreground mb-2">Playlist</div>
					{tracks.map((track, index) => (
						<button
							key={track.id}
							onClick={() => playTrackByIndex(index)}
							className={cn(
								"w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted truncate",
								index === currentTrackIndex && "bg-accent"
							)}
						>
							{track.name}
						</button>
					))}
				</div>
			)}
		</div>
	)
}

function WidgetPanel({
	widget,
	index,
	onClose,
}: {
	widget: NonNullWidget
	index: number
	onClose: () => void
}) {
	const [isMinimized, setIsMinimized] = React.useState(false)
	const dragControls = useDragControls()
	const { open: rightSidebarOpen } = useRightSidebar()
	const info = WIDGET_INFO[widget]

	// Offset each widget panel so they stack side by side
	const baseRight = rightSidebarOpen ? "21rem" : "5rem"
	const offset = index * 19 // 19rem per widget (18rem width + 1rem gap)

	if (isMinimized) {
		return (
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.8, opacity: 0 }}
				drag
				dragMomentum={false}
				className="fixed bottom-4 z-50 flex items-center gap-2 rounded-full bg-background border shadow-lg px-3 py-2 cursor-grab active:cursor-grabbing"
				style={{ right: `calc(${baseRight} + ${offset}rem)` }}
			>
				<HugeiconsIcon icon={info.icon} size={14} className="text-muted-foreground" />
				<span className="text-sm font-medium select-none">{info.label}</span>
				<Button variant="ghost" size="icon" className="size-6" onClick={() => setIsMinimized(false)}>
					<HugeiconsIcon icon={ArrowUp01Icon} size={12} />
				</Button>
				<Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
					<HugeiconsIcon icon={Cancel01Icon} size={12} />
				</Button>
			</motion.div>
		)
	}

	return (
		<motion.div
			initial={{ scale: 0.8, opacity: 0, y: 20 }}
			animate={{ scale: 1, opacity: 1, y: 0 }}
			exit={{ scale: 0.8, opacity: 0, y: 20 }}
			drag
			dragMomentum={false}
			dragControls={dragControls}
			dragListener={false}
			className="fixed bottom-4 z-50 w-72 rounded-xl bg-background border shadow-xl overflow-hidden"
			style={{ right: `calc(${baseRight} + ${offset}rem)` }}
		>
			{/* Header - drag handle */}
			<div
				onPointerDown={(e) => dragControls.start(e)}
				className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 cursor-grab active:cursor-grabbing touch-none"
			>
				<div className="flex items-center gap-2">
					<HugeiconsIcon icon={info.icon} size={14} className="text-muted-foreground" />
					<span className="text-xs font-medium text-muted-foreground select-none">
						{info.label}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-6" onClick={() => setIsMinimized(true)}>
						<HugeiconsIcon icon={ArrowDown01Icon} size={12} />
					</Button>
					<Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
						<HugeiconsIcon icon={Cancel01Icon} size={12} />
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="max-h-[70vh] overflow-y-auto">
				{widget === "calculator" && <BasicCalculator />}
				{widget === "music" && <MusicContent />}
				{widget === "notes" && <NotesWidget />}
				{widget === "stats" && <StatsWidget />}
				{widget === "converter" && <ConverterWidget />}
			</div>
		</motion.div>
	)
}

export function WidgetPanels() {
	const { activeWidgets, closeWidget } = useToolbar()

	// Sort widgets in consistent order for predictable positioning
	const openWidgets = WIDGET_ORDER.filter((w) => activeWidgets.has(w))

	return (
		<AnimatePresence>
			{openWidgets.map((widget, index) => (
				<WidgetPanel
					key={widget}
					widget={widget}
					index={index}
					onClose={() => closeWidget(widget)}
				/>
			))}
		</AnimatePresence>
	)
}
