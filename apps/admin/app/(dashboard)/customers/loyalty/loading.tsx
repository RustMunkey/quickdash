import { Skeleton } from "@/components/ui/skeleton"

export default function LoyaltyLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="space-y-1">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-4 w-64" />
			</div>

			{/* Tabs */}
			<div className="flex gap-2">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-8 w-28 rounded-md" />
				))}
			</div>

			{/* Config form */}
			<div className="rounded-lg border px-4 py-4 space-y-4 max-w-md">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-8 w-16" />
				</div>
				<div className="space-y-1.5">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-3 w-48" />
				</div>
				<div className="space-y-1.5">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-9 w-full" />
					<Skeleton className="h-3 w-56" />
				</div>
				<Skeleton className="h-8 w-36" />
			</div>
		</div>
	)
}
