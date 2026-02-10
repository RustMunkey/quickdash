"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	Calculator01Icon,
	MusicNote03Icon,
	Note01Icon,
	ChartHistogramIcon,
	ArrowDataTransferHorizontalIcon,
	Image01Icon,
	FileZipIcon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToolbar, type ToolbarWidget } from "./toolbar-provider"
import type { WorkspaceFeatures } from "@quickdash/db/schema"
import { cn } from "@/lib/utils"

const WIDGETS: {
	id: ToolbarWidget
	icon: typeof Calculator01Icon
	label: string
	feature?: keyof WorkspaceFeatures
}[] = [
	{ id: "calculator", icon: Calculator01Icon, label: "Calculator" },
	{ id: "music", icon: MusicNote03Icon, label: "Music" },
	{ id: "notes", icon: Note01Icon, label: "Notes" },
	{ id: "stats", icon: ChartHistogramIcon, label: "Quick Stats" },
	{ id: "converter", icon: ArrowDataTransferHorizontalIcon, label: "Converter" },
	{ id: "fileConverter", icon: Image01Icon, label: "File Converter", feature: "mediaLibrary" },
	{ id: "fileCompressor", icon: FileZipIcon, label: "Compressor", feature: "mediaLibrary" },
]

export function ToolbarPanel() {
	const { isOpen, isWidgetOpen, openWidget, features } = useToolbar()

	const visibleWidgets = WIDGETS.filter((w) => !w.feature || features[w.feature] !== false)

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ y: 80, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 80, opacity: 0 }}
					transition={{ type: "spring", damping: 25, stiffness: 300 }}
					className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
				>
					<div className="flex items-center gap-1 px-2 py-1.5 bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
						{visibleWidgets.map((widget) => (
							<Tooltip key={widget.id} delayDuration={0}>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className={cn(
											"size-9 rounded-full transition-colors",
											widget.id && isWidgetOpen(widget.id) && "bg-primary text-primary-foreground hover:bg-primary/90"
										)}
										onClick={() => openWidget(widget.id)}
									>
										<HugeiconsIcon icon={widget.icon} size={18} />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top" sideOffset={8}>
									<p>{widget.label}</p>
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
