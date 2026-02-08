"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface Commit {
	sha: string
	message: string
	author: string
	avatar: string | null
	date: string
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	const days = Math.floor(hrs / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.floor(days / 30)}mo ago`
}

export function ChangelogClient({
	commits,
	error,
}: {
	commits: Commit[]
	error: string | null
}) {
	if (error) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<p className="text-sm text-muted-foreground">
					Recent changes and updates.
				</p>
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-sm text-muted-foreground">{error}</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Group commits by date
	const grouped = commits.reduce(
		(acc, commit) => {
			const date = formatDate(commit.date)
			if (!acc[date]) acc[date] = []
			acc[date].push(commit)
			return acc
		},
		{} as Record<string, Commit[]>
	)

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Recent changes and updates.
			</p>
			<div className="space-y-6">
				{Object.entries(grouped).map(([date, dateCommits]) => (
					<div key={date}>
						<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
							{date}
						</h3>
						<div className="space-y-2">
							{dateCommits.map((commit) => (
								<div
									key={commit.sha}
									className="flex items-start gap-3 px-4 py-2.5 rounded-lg border bg-card"
								>
									<Avatar className="size-6 shrink-0 mt-0.5">
										{commit.avatar && <AvatarImage src={commit.avatar} />}
										<AvatarFallback className="text-[9px]">
											{commit.author.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm">{commit.message}</p>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-xs text-muted-foreground">
												{commit.author}
											</span>
											<span className="text-xs text-muted-foreground">
												{timeAgo(commit.date)}
											</span>
										</div>
									</div>
									<Badge
										variant="outline"
										className="font-mono text-[10px] shrink-0"
									>
										{commit.sha}
									</Badge>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
