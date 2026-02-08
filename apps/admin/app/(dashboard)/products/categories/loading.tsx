import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-8 w-32" />
			</div>

			<div className="rounded-lg border divide-y">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="h-8 w-8 rounded" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-16" />
							</div>
						</div>
						<Skeleton className="h-7 w-14" />
					</div>
				))}
			</div>
		</div>
	)
}
