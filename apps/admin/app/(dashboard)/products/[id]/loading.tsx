import { Skeleton } from "@/components/ui/skeleton"

export default function ProductDetailLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<Skeleton className="h-6 w-48" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-16" />
				</div>
			</div>

			<div className="flex gap-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-8 w-20 rounded-md" />
				))}
			</div>

			<div className="grid gap-4 max-w-2xl">
				<div className="space-y-1.5">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-9 w-full" />
				</div>
				<div className="space-y-1.5">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-24 w-full" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-9 w-full" />
					</div>
					<div className="space-y-1.5">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-9 w-full" />
					</div>
				</div>
			</div>
		</div>
	)
}
