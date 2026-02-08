import { Skeleton } from "@/components/ui/skeleton"

export default function SegmentsLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="space-y-1">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-64" />
			</div>

			<div className="flex justify-end">
				<Skeleton className="h-8 w-32" />
			</div>

			<div className="rounded-lg border divide-y">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="w-3 h-3 rounded-full" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-3 w-40" />
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Skeleton className="h-5 w-16 rounded-full" />
							<Skeleton className="h-4 w-20" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
