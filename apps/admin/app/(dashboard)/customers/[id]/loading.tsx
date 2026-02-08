import { Skeleton } from "@/components/ui/skeleton"

export default function CustomerDetailLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Skeleton className="w-12 h-12 rounded-full" />
				<div className="space-y-1">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-4 w-48" />
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-lg border px-4 py-3 space-y-2">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-6 w-16" />
					</div>
				))}
			</div>

			{/* Tabs */}
			<div className="space-y-4">
				<div className="flex gap-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-8 w-20 rounded-md" />
					))}
				</div>
				<div className="rounded-lg border divide-y">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="px-4 py-3 flex items-center justify-between">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
