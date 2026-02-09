"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

type StorageData = {
	usedBytes: number
	maxBytes: number
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function StorageIndicator() {
	const [data, setData] = useState<StorageData | null>(null)

	useEffect(() => {
		fetch("/api/storage-usage")
			.then((r) => r.ok ? r.json() : null)
			.then(setData)
			.catch(() => {})
	}, [])

	if (!data) return null

	const isUnlimited = data.maxBytes === -1
	const pct = isUnlimited ? 0 : data.maxBytes > 0 ? Math.min((data.usedBytes / data.maxBytes) * 100, 100) : 0
	const isWarning = !isUnlimited && pct > 80
	const isCritical = !isUnlimited && pct > 95

	return (
		<Link href="/billing" className="block px-3 py-2 group">
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Storage</span>
					<span className={`text-[11px] ${isCritical ? "text-destructive" : isWarning ? "text-yellow-600 dark:text-yellow-500" : "text-muted-foreground"}`}>
						{formatBytes(data.usedBytes)}{isUnlimited ? "" : ` / ${formatBytes(data.maxBytes)}`}
					</span>
				</div>
				{!isUnlimited && (
					<Progress
						value={pct}
						className={`h-1.5 ${isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
					/>
				)}
			</div>
		</Link>
	)
}
