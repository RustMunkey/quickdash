import { Skeleton } from "@/components/ui/skeleton"

export default function ReviewDetailLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-20" />
				</div>
			</div>

			{/* Rating + content */}
			<div className="rounded-lg border px-4 py-4 space-y-3 max-w-2xl">
				<div className="flex items-center gap-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-5 w-5" />
					))}
				</div>
				<Skeleton className="h-5 w-64" />
				<div className="space-y-1">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			</div>

			{/* Info */}
			<div className="grid gap-4 md:grid-cols-2 max-w-2xl">
				<div className="rounded-lg border px-4 py-4 space-y-2">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-40" />
				</div>
				<div className="rounded-lg border px-4 py-4 space-y-2">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-3 w-36" />
				</div>
			</div>
		</div>
	)
}
