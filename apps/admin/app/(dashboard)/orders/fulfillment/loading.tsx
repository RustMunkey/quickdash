import { Skeleton } from "@/components/ui/skeleton"

export default function FulfillmentLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="space-y-1">
				<Skeleton className="h-5 w-28" />
				<Skeleton className="h-4 w-56" />
			</div>

			<div className="rounded-lg border divide-y">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</div>
		</div>
	)
}
