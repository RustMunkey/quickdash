import { Skeleton } from "@/components/ui/skeleton"

export default function GiftCardDetailLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>
				<Skeleton className="h-8 w-24" />
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="rounded-lg border px-4 py-3 space-y-2">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-6 w-20" />
					</div>
				))}
			</div>

			{/* Issue details */}
			<div className="rounded-lg border px-4 py-4 space-y-3 max-w-md">
				<div className="space-y-1">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-4 w-40" />
				</div>
				<div className="space-y-1">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-4 w-36" />
				</div>
			</div>

			{/* Transactions */}
			<div className="space-y-3">
				<Skeleton className="h-4 w-28" />
				<div className="rounded-lg border divide-y">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="px-4 py-3 flex items-center justify-between">
							<Skeleton className="h-5 w-16 rounded-full" />
							<div className="flex items-center gap-3">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
